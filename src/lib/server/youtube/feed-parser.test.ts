import { describe, expect, test } from 'bun:test'
import type { FetchLike } from '../fetch'
import { join } from 'node:path'
import { parseChannelFeed, fetchChannelFeed, feedUrl } from './feed-parser'

const fixtureXml = await Bun.file(join(import.meta.dir, 'fixtures', 'channel-feed.xml')).text()

describe('parseChannelFeed', () => {
	test('parses channel metadata', () => {
		const result = parseChannelFeed(fixtureXml)
		expect(result.isOk).toBe(true)
		if (result.isError) return

		expect(result.data.ytChannelId).toBe('UCtest000000000000000000')
		expect(result.data.title).toBe('Linus Tech Tips')
		expect(result.data.channelUrl).toBe('https://www.youtube.com/channel/UCtest000000000000000000')
	})

	test('parses entries with thumbnails and descriptions from media:group', () => {
		const result = parseChannelFeed(fixtureXml)
		if (result.isError) throw new Error('parse failed')

		expect(result.data.entries).toHaveLength(2)

		const short = result.data.entries[0]
		expect(short.ytVideoId).toBe('aaaaaaaaaa1')
		expect(short.title).toBe('Swimming Against Man-Made Waves')
		expect(short.link).toBe('https://www.youtube.com/shorts/aaaaaaaaaa1')
		expect(short.thumbnailUrl).toBe('https://i2.ytimg.com/vi/aaaaaaaaaa1/hqdefault.jpg')
		expect(short.description).toBe('How long can we last against a man-made wave?')
		expect(short.publishedAt.toISOString()).toBe('2026-07-06T17:45:47.000Z')
		expect(short.updatedAt.toISOString()).toBe('2026-07-07T08:07:28.000Z')

		const regular = result.data.entries[1]
		expect(regular.ytVideoId).toBe('bbbbbbbbbb2')
		expect(regular.link).toBe('https://www.youtube.com/watch?v=bbbbbbbbbb2')
		expect(regular.description).toContain('Saily eSIM')
		expect(regular.description).toContain('& more description text here')
	})

	test('handles a feed with a single entry (non-array)', () => {
		const singleEntry = fixtureXml.replace(/<entry>[\s\S]*?<\/entry>\s*(?=<entry>)/, '')
		const result = parseChannelFeed(singleEntry)
		if (result.isError) throw new Error('parse failed')
		expect(result.data.entries).toHaveLength(1)
	})

	test('handles a feed with no entries', () => {
		const noEntries = fixtureXml.replace(/<entry>[\s\S]*<\/entry>/, '')
		const result = parseChannelFeed(noEntries)
		if (result.isError) throw new Error('parse failed')
		expect(result.data.entries).toHaveLength(0)
	})

	test('errors on non-feed XML', () => {
		expect(parseChannelFeed('<html></html>').isError).toBe(true)
		expect(parseChannelFeed('not xml at all <<<').isError).toBe(true)
	})
})

describe('fetchChannelFeed', () => {
	test('fetches the canonical feed URL and parses the body', async () => {
		let requestedUrl = ''
		const fetchFn = (async (url: string | URL | Request) => {
			requestedUrl = String(url)
			return new Response(fixtureXml)
		}) as FetchLike

		const result = await fetchChannelFeed('UCtest000000000000000000', fetchFn)
		expect(requestedUrl).toBe(feedUrl('UCtest000000000000000000'))
		expect(result.isOk).toBe(true)
	})

	test('errors on non-200 responses', async () => {
		const fetchFn = (async () => new Response('nope', { status: 404 })) as FetchLike
		const result = await fetchChannelFeed('UCdoesnotexist', fetchFn)
		expect(result.isError).toBe(true)
	})
})
