import { query, command, getRequestEvent } from '$app/server'
import { error } from '@sveltejs/kit'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import * as v from 'valibot'

import { env } from '$env/dynamic/private'
import { db } from '$lib/server/db'
import { channels, feeds, feedRules, feedItems, videos } from '$lib/server/db/schema'
import { resolveChannelId } from '$lib/server/youtube/resolve'
import { fetchChannelFeed } from '$lib/server/youtube/feed-parser'
import { ingestChannel, seedFeedItems, refreshChannelIcon } from '$lib/server/ingest'
import { evaluateVideo } from '$lib/server/ingest/rules'
import { subscribeChannel, unsubscribeChannel } from '$lib/server/websub'

function needsWebsubSubscription(
	channel: Pick<typeof channels.$inferSelect, 'websubStatus' | 'websubLeaseExpiresAt'>
) {
	return channel.websubStatus !== 'active' || !channel.websubLeaseExpiresAt
}

function requireUser() {
	const { locals } = getRequestEvent()
	if (!locals.user) error(401, 'Not logged in')
	return locals.user
}

function publicFeedUrl(token: string): string {
	return `${env.SITE_URL}/rss/${token}.xml`
}

const ruleSchema = v.object({
	type: v.picklist(['exclude', 'require']),
	match: v.picklist(['title', 'description', 'both']),
	value: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))
})

const settingsSchema = v.object({
	feedId: v.string(),
	includeShorts: v.boolean(),
	rules: v.pipe(v.array(ruleSchema), v.maxLength(50))
})

async function ownedFeed(feedId: string, userId: string) {
	const [feed] = await db
		.select()
		.from(feeds)
		.where(and(eq(feeds.id, feedId), eq(feeds.userId, userId)))
	if (!feed) error(404, 'Feed not found')
	return feed
}

/** Lists the current user's feeds with channel info and item counts */
export const getFeeds = query(async () => {
	const user = requireUser()

	const rows = await db
		.select({
			id: feeds.id,
			title: feeds.title,
			includeShorts: feeds.includeShorts,
			token: feeds.token,
			createdAt: feeds.createdAt,
			channelTitle: channels.title,
			channelUrl: channels.channelUrl,
			channelIcon: channels.iconUrl
		})
		.from(feeds)
		.innerJoin(channels, eq(feeds.channelId, channels.id))
		.where(eq(feeds.userId, user.id))
		.orderBy(desc(feeds.createdAt))

	if (rows.length === 0) return []

	const feedIds = rows.map((r) => r.id)
	const itemCounts = await db
		.select({ feedId: feedItems.feedId, count: count() })
		.from(feedItems)
		.where(inArray(feedItems.feedId, feedIds))
		.groupBy(feedItems.feedId)
	const ruleCounts = await db
		.select({ feedId: feedRules.feedId, count: count() })
		.from(feedRules)
		.where(inArray(feedRules.feedId, feedIds))
		.groupBy(feedRules.feedId)

	const itemsByFeed = new Map(itemCounts.map((r) => [r.feedId, r.count]))
	const rulesByFeed = new Map(ruleCounts.map((r) => [r.feedId, r.count]))

	return rows.map((row) => ({
		id: row.id,
		title: row.title ?? row.channelTitle,
		channelTitle: row.channelTitle,
		channelUrl: row.channelUrl,
		channelIcon: row.channelIcon,
		includeShorts: row.includeShorts,
		itemCount: itemsByFeed.get(row.id) ?? 0,
		ruleCount: rulesByFeed.get(row.id) ?? 0,
		feedUrl: publicFeedUrl(row.token)
	}))
})

/** Full detail for the feed settings screen */
export const getFeed = query(v.string(), async (feedId) => {
	const user = requireUser()
	const feed = await ownedFeed(feedId, user.id)

	const [channel] = await db.select().from(channels).where(eq(channels.id, feed.channelId))
	const rules = await db
		.select({
			type: feedRules.type,
			match: feedRules.match,
			value: feedRules.value
		})
		.from(feedRules)
		.where(eq(feedRules.feedId, feed.id))
		.orderBy(feedRules.createdAt)

	return {
		id: feed.id,
		title: feed.title ?? channel.title,
		includeShorts: feed.includeShorts,
		rules,
		feedUrl: publicFeedUrl(feed.token),
		channel: {
			title: channel.title,
			url: channel.channelUrl,
			icon: channel.iconUrl,
			websubStatus: channel.websubStatus
		}
	}
})

/** Adds a feed from any pasted YouTube URL, creating the channel if needed */
export const addFeed = command(v.pipe(v.string(), v.trim(), v.minLength(1)), async (url) => {
	const user = requireUser()

	const resolved = await resolveChannelId(url)
	if (resolved.isError) error(400, resolved.error)

	let subscriptionRequested = false
	let [channel] = await db
		.select()
		.from(channels)
		.where(eq(channels.ytChannelId, resolved.data.ytChannelId))

	if (!channel) {
		const feedResult = await fetchChannelFeed(resolved.data.ytChannelId)
		if (feedResult.isError) error(400, `Couldn’t load that channel’s feed: ${feedResult.error}`)

		;[channel] = await db
			.insert(channels)
			.values({
				ytChannelId: feedResult.data.ytChannelId,
				title: feedResult.data.title,
				channelUrl: feedResult.data.channelUrl
			})
			.onConflictDoNothing()
			.returning()

		if (channel) {
			await ingestChannel(db, channel.id)
			await subscribeChannel(db, channel)
			subscriptionRequested = true
			// The avatar arrives asynchronously; don't block feed creation
			void refreshChannelIcon(db, channel)
		} else {
			// Lost a race with a concurrent add — fetch the winner
			;[channel] = await db
				.select()
				.from(channels)
				.where(eq(channels.ytChannelId, resolved.data.ytChannelId))
		}
	}

	if (!subscriptionRequested && needsWebsubSubscription(channel)) {
		await subscribeChannel(db, channel)
	}

	const [feed] = await db
		.insert(feeds)
		.values({ userId: user.id, channelId: channel.id })
		.returning()
	await seedFeedItems(db, feed.id)

	// Single-flight: ship the updated list back with this response
	void getFeeds().refresh()

	return { feedId: feed.id }
})

/**
 * Persists feed settings. Only future videos are affected — existing
 * feed items are intentionally left untouched (no back-editing).
 */
export const updateFeed = command(settingsSchema, async ({ feedId, includeShorts, rules }) => {
	const user = requireUser()
	const feed = await ownedFeed(feedId, user.id)

	await db.update(feeds).set({ includeShorts }).where(eq(feeds.id, feed.id))
	await db.delete(feedRules).where(eq(feedRules.feedId, feed.id))
	if (rules.length > 0) {
		await db.insert(feedRules).values(rules.map((rule) => ({ ...rule, feedId: feed.id })))
	}

	// Single-flight: updated detail + list ship back with this response
	void getFeed(feedId).refresh()
	void getFeeds().refresh()

	return { ok: true }
})

/**
 * Evaluates draft settings against the channel's stored videos so the UI
 * can show what the feed would look like — without persisting anything.
 */
export const previewFeed = query(settingsSchema, async ({ feedId, includeShorts, rules }) => {
	const user = requireUser()
	const feed = await ownedFeed(feedId, user.id)

	const channelVideos = await db
		.select()
		.from(videos)
		.where(eq(videos.channelId, feed.channelId))
		.orderBy(desc(videos.publishedAt))
		.limit(30)

	return channelVideos.map((video) => {
		const verdict = evaluateVideo(
			{ title: video.title, description: video.description, isShort: video.isShort },
			{ includeShorts, rules }
		)
		return {
			ytVideoId: video.ytVideoId,
			title: video.title,
			thumbnailUrl: video.thumbnailUrl,
			videoUrl: video.videoUrl,
			publishedAt: video.publishedAt,
			isShort: video.isShort,
			included: verdict.included,
			reason: verdict.included ? null : verdict.reason
		}
	})
})

/** Deletes a feed; drops the channel + subscription when it was the last one */
export const deleteFeed = command(v.string(), async (feedId) => {
	const user = requireUser()
	const feed = await ownedFeed(feedId, user.id)

	await db.delete(feeds).where(eq(feeds.id, feed.id))

	const [{ count: remaining }] = await db
		.select({ count: count() })
		.from(feeds)
		.where(eq(feeds.channelId, feed.channelId))

	if (remaining === 0) {
		const [channel] = await db.select().from(channels).where(eq(channels.id, feed.channelId))
		if (channel) {
			await unsubscribeChannel(db, channel)
			await db.delete(channels).where(eq(channels.id, channel.id))
		}
	}

	// Single-flight: the list the user returns to is already refreshed
	void getFeeds().refresh()

	return { ok: true }
})
