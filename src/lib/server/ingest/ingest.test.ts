import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { FetchLike } from '../fetch'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createDb } from '../db/client'
import { channels, feeds, feedRules, feedItems, videos, user } from '../db/schema'
import { ingestChannel, seedFeedItems } from './index'

// Integration test against the local docker Postgres. Bun skips .env.local
// under NODE_ENV=test, so fall back to reading it directly.
async function resolveDbUrl(): Promise<string> {
	if (process.env.DB_URL) return process.env.DB_URL
	const envLocal = Bun.file(join(import.meta.dir, '..', '..', '..', '..', '.env.local'))
	if (await envLocal.exists()) {
		const match = (await envLocal.text()).match(/^DB_URL=(.+)$/m)
		if (match) return match[1].trim()
	}
	throw new Error('DB_URL is not set — run: bun run docker:start')
}

const db = createDb(await resolveDbUrl())
const fixtureXml = await Bun.file(
	join(import.meta.dir, '..', 'youtube', 'fixtures', 'channel-feed.xml')
).text()

const FIXTURE_CHANNEL = 'UCtest000000000000000000'
const SHORT_ID = 'aaaaaaaaaa1'

// Serves the fixture feed and answers Shorts HEAD probes like YouTube does
const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
	const href = String(url)
	if (href.includes('/feeds/videos.xml')) return new Response(fixtureXml)
	if (href.includes('/shorts/') && init?.method === 'HEAD') {
		return href.includes(SHORT_ID)
			? new Response(null, { status: 200 })
			: new Response(null, { status: 303, headers: { location: 'https://www.youtube.com/watch' } })
	}
	throw new Error(`Unexpected fetch: ${href}`)
}) as FetchLike

const testUserId = randomUUID()
let channelId: string
let plainFeedId: string
let filteredFeedId: string

async function cleanup() {
	await db.delete(channels).where(eq(channels.ytChannelId, FIXTURE_CHANNEL))
	await db.delete(user).where(eq(user.id, testUserId))
}

beforeAll(async () => {
	await cleanup()

	await db.insert(user).values({
		id: testUserId,
		name: 'Test User',
		email: `ingest-test-${testUserId}@example.com`
	})

	const [channel] = await db
		.insert(channels)
		.values({
			ytChannelId: FIXTURE_CHANNEL,
			title: 'Fixture Channel',
			channelUrl: `https://www.youtube.com/channel/${FIXTURE_CHANNEL}`
		})
		.returning()
	channelId = channel.id

	// One default feed (no shorts, no rules), one with an exclude rule
	const [plain] = await db.insert(feeds).values({ userId: testUserId, channelId }).returning()
	plainFeedId = plain.id

	const [filtered] = await db
		.insert(feeds)
		.values({ userId: testUserId, channelId, includeShorts: true })
		.returning()
	filteredFeedId = filtered.id
	await db.insert(feedRules).values({
		feedId: filteredFeedId,
		type: 'exclude',
		match: 'title',
		value: 'hate'
	})
})

afterAll(cleanup)

describe('ingestChannel', () => {
	test('ingests fixture videos and materializes feed items per feed settings', async () => {
		const result = await ingestChannel(db, channelId, mockFetch)
		expect(result.isOk).toBe(true)
		if (result.isError) throw new Error(result.error)

		expect(result.data.newVideos).toBe(2)

		const storedVideos = await db.select().from(videos).where(eq(videos.channelId, channelId))
		expect(storedVideos).toHaveLength(2)
		const short = storedVideos.find((v) => v.ytVideoId === SHORT_ID)
		expect(short?.isShort).toBe(true)
		expect(short?.thumbnailUrl).toContain('hqdefault.jpg')

		// Plain feed: shorts off → only the regular video
		const plainItems = await db.select().from(feedItems).where(eq(feedItems.feedId, plainFeedId))
		expect(plainItems).toHaveLength(1)

		// Filtered feed: shorts on but "hate" excluded → only the short
		const filteredItems = await db
			.select()
			.from(feedItems)
			.where(eq(feedItems.feedId, filteredFeedId))
		expect(filteredItems).toHaveLength(1)
	})

	test('is idempotent — a second ingest adds nothing', async () => {
		const result = await ingestChannel(db, channelId, mockFetch)
		if (result.isError) throw new Error(result.error)

		expect(result.data.newVideos).toBe(0)
		expect(result.data.feedItemsAdded).toBe(0)

		const storedVideos = await db.select().from(videos).where(eq(videos.channelId, channelId))
		expect(storedVideos).toHaveLength(2)
	})

	test('updates channel title and lastPolledAt from the feed', async () => {
		const [channel] = await db.select().from(channels).where(eq(channels.id, channelId))
		expect(channel.title).toBe('Linus Tech Tips')
		expect(channel.lastPolledAt).not.toBeNull()
	})

	test('refreshes metadata of known videos without touching feed membership', async () => {
		await db.update(videos).set({ title: 'stale title' }).where(eq(videos.ytVideoId, SHORT_ID))

		const result = await ingestChannel(db, channelId, mockFetch)
		if (result.isError) throw new Error(result.error)
		expect(result.data.updatedVideos).toBe(1)

		const [refreshed] = await db.select().from(videos).where(eq(videos.ytVideoId, SHORT_ID))
		expect(refreshed.title).toBe('Swimming Against Man-Made Waves')

		const plainItems = await db.select().from(feedItems).where(eq(feedItems.feedId, plainFeedId))
		expect(plainItems).toHaveLength(1)
	})
})

describe('seedFeedItems', () => {
	test('seeds a new feed from already-known videos using its settings', async () => {
		const [seeded] = await db
			.insert(feeds)
			.values({ userId: testUserId, channelId, includeShorts: true })
			.returning()

		const added = await seedFeedItems(db, seeded.id)
		expect(added).toBe(2)

		const again = await seedFeedItems(db, seeded.id)
		expect(again).toBe(0)
	})
})
