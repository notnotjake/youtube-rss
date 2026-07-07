import { eq, inArray } from 'drizzle-orm'
import type { FetchLike } from '../fetch'
import type { Db } from '../db/client'
import { channels, feeds, feedRules, feedItems, videos } from '../db/schema'
import { fetchChannelFeed, type FeedEntry } from '../youtube/feed-parser'
import { fetchChannelIcon } from '../youtube/channel-icon'
import { isShort } from '../youtube/shorts'
import { evaluateVideo, type FeedRule } from './rules'
import { err, ok, type StructuredResult } from '$utils/structured-result'

export type IngestCounts = {
	newVideos: number
	updatedVideos: number
	feedItemsAdded: number
}

async function rulesByFeedId(db: Db, feedIds: string[]): Promise<Map<string, FeedRule[]>> {
	const map = new Map<string, FeedRule[]>()
	if (feedIds.length === 0) return map

	const rows = await db.select().from(feedRules).where(inArray(feedRules.feedId, feedIds))
	for (const row of rows) {
		const list = map.get(row.feedId) ?? []
		list.push({ type: row.type, match: row.match, value: row.value })
		map.set(row.feedId, list)
	}
	return map
}

/**
 * Fetches a channel's feed and ingests anything new. Both the WebSub
 * callback and the polling scheduler funnel through here.
 *
 * New videos are evaluated against each feed's settings as they are at
 * this moment and materialized into feedItems — settings changes never
 * back-edit previously published items. Known videos only get metadata
 * refreshes (title, description, thumbnail).
 */
export async function ingestChannel(
	db: Db,
	channelId: string,
	fetchFn: FetchLike = fetch
): Promise<StructuredResult<IngestCounts, string>> {
	const [channel] = await db.select().from(channels).where(eq(channels.id, channelId))
	if (!channel) return err('Channel not found')

	const feedResult = await fetchChannelFeed(channel.ytChannelId, fetchFn)

	// Record the poll attempt even on failure so a dead channel can't hot-loop the scheduler
	await db
		.update(channels)
		.set({ lastPolledAt: new Date(), ...(feedResult.isOk ? { title: feedResult.data.title } : {}) })
		.where(eq(channels.id, channel.id))

	if (feedResult.isError) return err(feedResult.error)
	const parsed = feedResult.data

	const counts: IngestCounts = { newVideos: 0, updatedVideos: 0, feedItemsAdded: 0 }
	if (parsed.entries.length === 0) return ok(counts)

	const existingRows = await db
		.select()
		.from(videos)
		.where(
			inArray(
				videos.ytVideoId,
				parsed.entries.map((e) => e.ytVideoId)
			)
		)
	const existingByYtId = new Map(existingRows.map((v) => [v.ytVideoId, v]))

	const channelFeeds = await db.select().from(feeds).where(eq(feeds.channelId, channel.id))
	const feedRuleMap = await rulesByFeedId(
		db,
		channelFeeds.map((f) => f.id)
	)

	for (const entry of parsed.entries) {
		const known = existingByYtId.get(entry.ytVideoId)

		if (known) {
			const changed =
				known.title !== entry.title ||
				known.description !== entry.description ||
				known.thumbnailUrl !== entry.thumbnailUrl
			if (changed) {
				await db
					.update(videos)
					.set({
						title: entry.title,
						description: entry.description,
						thumbnailUrl: entry.thumbnailUrl,
						updatedAt: entry.updatedAt
					})
					.where(eq(videos.id, known.id))
				counts.updatedVideos++
			}
			continue
		}

		const short = await isShort(entry, fetchFn)
		const [video] = await db
			.insert(videos)
			.values({
				channelId: channel.id,
				ytVideoId: entry.ytVideoId,
				title: entry.title,
				description: entry.description,
				thumbnailUrl: entry.thumbnailUrl,
				videoUrl: entry.link,
				isShort: short,
				publishedAt: entry.publishedAt,
				updatedAt: entry.updatedAt
			})
			.onConflictDoNothing()
			.returning()
		if (!video) continue // lost a race with a concurrent ingest
		counts.newVideos++

		for (const feed of channelFeeds) {
			const verdict = evaluateVideo(
				{ title: entry.title, description: entry.description, isShort: short },
				{ includeShorts: feed.includeShorts, rules: feedRuleMap.get(feed.id) ?? [] }
			)
			if (!verdict.included) continue

			const inserted = await db
				.insert(feedItems)
				.values({ feedId: feed.id, videoId: video.id })
				.onConflictDoNothing()
				.returning()
			if (inserted.length > 0) counts.feedItemsAdded++
		}
	}

	return ok(counts)
}

/** Fetches and stores the channel's avatar. Safe to fire-and-forget. */
export async function refreshChannelIcon(
	db: Db,
	channel: { id: string; ytChannelId: string },
	fetchFn: FetchLike = fetch
): Promise<void> {
	const icon = await fetchChannelIcon(channel.ytChannelId, fetchFn)
	if (icon) {
		await db.update(channels).set({ iconUrl: icon }).where(eq(channels.id, channel.id))
	}
}

/**
 * Seeds a just-created feed with the channel's already-known videos so the
 * feed isn't born empty, applying the feed's initial settings.
 */
export async function seedFeedItems(db: Db, feedId: string): Promise<number> {
	const [feed] = await db.select().from(feeds).where(eq(feeds.id, feedId))
	if (!feed) return 0

	const channelVideos = await db.select().from(videos).where(eq(videos.channelId, feed.channelId))
	const feedRuleMap = await rulesByFeedId(db, [feed.id])
	const rules = feedRuleMap.get(feed.id) ?? []

	let added = 0
	for (const video of channelVideos) {
		const verdict = evaluateVideo(
			{ title: video.title, description: video.description, isShort: video.isShort },
			{ includeShorts: feed.includeShorts, rules }
		)
		if (!verdict.included) continue

		const inserted = await db
			.insert(feedItems)
			.values({ feedId: feed.id, videoId: video.id })
			.onConflictDoNothing()
			.returning()
		if (inserted.length > 0) added++
	}
	return added
}

export type { FeedEntry }
