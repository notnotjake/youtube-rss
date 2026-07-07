import { describe, expect, test } from 'bun:test'
import type { FetchLike } from '../fetch'
import { join } from 'node:path'
import { resolveChannelId } from './resolve'

const channelPage = await Bun.file(join(import.meta.dir, 'fixtures', 'channel-page.html')).text()
const watchPage = await Bun.file(join(import.meta.dir, 'fixtures', 'watch-page.html')).text()

const CHANNEL_ID = 'UCXuqSBlHAE6Xw-yeJA0Tunw'

function pageFetch(expectedUrl: string, body: string): FetchLike {
	return (async (url: string | URL | Request) => {
		expect(String(url)).toBe(expectedUrl)
		return new Response(body)
	}) as FetchLike
}

const neverFetch = (async () => {
	throw new Error('fetch should not be called')
}) as FetchLike

describe('resolveChannelId', () => {
	test('accepts a bare channel id', async () => {
		const result = await resolveChannelId(CHANNEL_ID, neverFetch)
		expect(result.isOk && result.data.ytChannelId).toBe(CHANNEL_ID)
	})

	test('parses /channel/ URLs without fetching', async () => {
		const result = await resolveChannelId(
			`https://www.youtube.com/channel/${CHANNEL_ID}`,
			neverFetch
		)
		expect(result.isOk && result.data.ytChannelId).toBe(CHANNEL_ID)
	})

	test('resolves @handle URLs via the canonical link', async () => {
		const fetchFn = pageFetch('https://www.youtube.com/@LinusTechTips', channelPage)
		const result = await resolveChannelId('https://www.youtube.com/@LinusTechTips', fetchFn)
		expect(result.isOk && result.data.ytChannelId).toBe(CHANNEL_ID)
	})

	test('does not pick up recommended-content channel ids on channel pages', async () => {
		const fetchFn = pageFetch('https://www.youtube.com/@LinusTechTips', channelPage)
		const result = await resolveChannelId('youtube.com/@LinusTechTips', fetchFn)
		// The fixture embeds other channels' ids in script data before the canonical link
		expect(result.isOk && result.data.ytChannelId).toBe(CHANNEL_ID)
	})

	test('resolves /c/ and /user/ URLs via the canonical link', async () => {
		const fetchFn = pageFetch('https://www.youtube.com/c/LinusTechTips', channelPage)
		const result = await resolveChannelId('https://www.youtube.com/c/LinusTechTips', fetchFn)
		expect(result.isOk && result.data.ytChannelId).toBe(CHANNEL_ID)
	})

	test('resolves watch URLs via the player response', async () => {
		const fetchFn = pageFetch('https://www.youtube.com/watch?v=S82W3hWDvZA', watchPage)
		const result = await resolveChannelId('https://www.youtube.com/watch?v=S82W3hWDvZA', fetchFn)
		expect(result.isOk && result.data.ytChannelId).toBe(CHANNEL_ID)
	})

	test('resolves youtu.be and /shorts/ URLs through the watch page', async () => {
		const fetchFn = pageFetch('https://www.youtube.com/watch?v=S82W3hWDvZA', watchPage)

		const short = await resolveChannelId('https://youtube.com/shorts/S82W3hWDvZA', fetchFn)
		expect(short.isOk && short.data.ytChannelId).toBe(CHANNEL_ID)

		const shared = await resolveChannelId('https://youtu.be/S82W3hWDvZA', fetchFn)
		expect(shared.isOk && shared.data.ytChannelId).toBe(CHANNEL_ID)
	})

	test('rejects non-YouTube URLs', async () => {
		const result = await resolveChannelId('https://vimeo.com/12345', neverFetch)
		expect(result.isError).toBe(true)
	})

	test('rejects garbage input', async () => {
		const result = await resolveChannelId('not a url %%%', neverFetch)
		expect(result.isError).toBe(true)
	})

	test('errors when the page has no channel id', async () => {
		const fetchFn = (async () => new Response('<html></html>')) as FetchLike
		const result = await resolveChannelId('https://www.youtube.com/@ghost', fetchFn)
		expect(result.isError).toBe(true)
	})
})
