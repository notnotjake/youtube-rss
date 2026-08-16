import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { inArray } from 'drizzle-orm'

import { createDb } from './db/client'
import { channels, feedItems, feeds, user, videos } from './db/schema'
import { listMaterializedFeedItems } from './feed-items'

async function resolveDbUrl(): Promise<string> {
	if (process.env.DB_URL) return process.env.DB_URL
	const envLocal = Bun.file(join(import.meta.dir, '..', '..', '..', '.env.local'))
	if (await envLocal.exists()) {
		const match = (await envLocal.text()).match(/^DB_URL=(.+)$/m)
		if (match) return match[1].trim()
	}
	throw new Error('DB_URL is not set — run: bun run docker:start')
}

const db = createDb(await resolveDbUrl())
const testId = randomUUID()
const testUserId = randomUUID()
const otherUserId = randomUUID()
const channelIds: string[] = []
let busyFeedId: string
let overlappingFeedId: string
let quietFeedId: string

beforeAll(async () => {
	await db.insert(user).values([
		{ id: testUserId, name: 'Feed Test User', email: `feed-test-${testId}@example.com` },
		{ id: otherUserId, name: 'Other Feed User', email: `feed-test-other-${testId}@example.com` }
	])

	const insertedChannels = await db
		.insert(channels)
		.values([
			{
				ytChannelId: `UCbusy-${testId}`,
				title: 'Busy channel',
				channelUrl: `https://youtube.com/channel/UCbusy-${testId}`
			},
			{
				ytChannelId: `UCquiet-${testId}`,
				title: 'Quiet channel',
				channelUrl: `https://youtube.com/channel/UCquiet-${testId}`
			},
			{
				ytChannelId: `UCother-${testId}`,
				title: 'Other user channel',
				channelUrl: `https://youtube.com/channel/UCother-${testId}`
			}
		])
		.returning()
	channelIds.push(...insertedChannels.map((channel) => channel.id))
	const [busyChannel, quietChannel, otherChannel] = insertedChannels

	const insertedFeeds = await db
		.insert(feeds)
		.values([
			{ userId: testUserId, channelId: busyChannel.id },
			{ userId: testUserId, channelId: busyChannel.id },
			{ userId: testUserId, channelId: quietChannel.id },
			{ userId: otherUserId, channelId: otherChannel.id }
		])
		.returning()
	;[busyFeedId, overlappingFeedId, quietFeedId] = insertedFeeds.map((feed) => feed.id)

	const now = Date.now()
	const busyVideos = await db
		.insert(videos)
		.values(
			Array.from({ length: 125 }, (_, index) => ({
				channelId: busyChannel.id,
				ytVideoId: `busy-${testId}-${index}`,
				title: `Busy video ${index}`,
				videoUrl: `https://youtube.com/watch?v=busy-${testId}-${index}`,
				publishedAt: new Date(now - index * 60_000),
				updatedAt: new Date(now - index * 60_000)
			}))
		)
		.returning()
	await db.insert(feedItems).values(
		busyVideos.flatMap((video) => [
			{ feedId: busyFeedId, videoId: video.id },
			{ feedId: overlappingFeedId, videoId: video.id }
		])
	)

	const quietVideos = await db
		.insert(videos)
		.values(
			Array.from({ length: 3 }, (_, index) => ({
				channelId: quietChannel.id,
				ytVideoId: `quiet-${testId}-${index}`,
				title: `Quiet video ${index}`,
				videoUrl: `https://youtube.com/watch?v=quiet-${testId}-${index}`,
				publishedAt: new Date(now - (1_000 + index) * 60_000),
				updatedAt: new Date(now - (1_000 + index) * 60_000)
			}))
		)
		.returning()
	await db
		.insert(feedItems)
		.values(quietVideos.map((video) => ({ feedId: quietFeedId, videoId: video.id })))

	const [otherVideo] = await db
		.insert(videos)
		.values({
			channelId: otherChannel.id,
			ytVideoId: `other-${testId}`,
			title: 'Other user video',
			videoUrl: `https://youtube.com/watch?v=other-${testId}`,
			publishedAt: new Date(now + 60_000),
			updatedAt: new Date(now + 60_000)
		})
		.returning()
	await db.insert(feedItems).values({ feedId: insertedFeeds[3].id, videoId: otherVideo.id })
})

afterAll(async () => {
	await db.delete(channels).where(inArray(channels.id, channelIds))
	await db.delete(user).where(inArray(user.id, [testUserId, otherUserId]))
})

describe('listMaterializedFeedItems', () => {
	test('deduplicates before applying the combined feed limit', async () => {
		const items = await listMaterializedFeedItems(db, testUserId, null)

		expect(items).toHaveLength(120)
		expect(new Set(items.map((item) => item.ytVideoId)).size).toBe(120)
		expect(items.some((item) => item.ytVideoId === `other-${testId}`)).toBe(false)
	})

	test('applies a separate limit after filtering to a subscription', async () => {
		const busyItems = await listMaterializedFeedItems(db, testUserId, busyFeedId)
		const quietItems = await listMaterializedFeedItems(db, testUserId, quietFeedId)

		expect(busyItems).toHaveLength(120)
		expect(quietItems).toHaveLength(3)
		expect(quietItems.every((item) => item.feedId === quietFeedId)).toBe(true)
	})

	test('does not expose another user’s subscription by id', async () => {
		const items = await listMaterializedFeedItems(db, otherUserId, overlappingFeedId)
		expect(items).toEqual([])
	})
})
