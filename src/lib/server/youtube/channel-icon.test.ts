import { describe, expect, test } from 'bun:test'
import type { FetchLike } from '../fetch'
import { fetchChannelIcon } from './channel-icon'

const AVATAR = 'https://yt3.googleusercontent.com/abc123=s900-c-k-c0x00ffffff-no-rj'
const page = `<html><head><meta property="og:image" content="${AVATAR}"></head></html>`

describe('fetchChannelIcon', () => {
	test('extracts the og:image avatar from the channel page', async () => {
		const fetchFn = (async (url: string | URL | Request) => {
			expect(String(url)).toBe('https://www.youtube.com/channel/UCtest000000000000000000')
			return new Response(page)
		}) as FetchLike

		const icon = await fetchChannelIcon('UCtest000000000000000000', fetchFn)
		expect(icon).toBe(AVATAR)
	})

	test('returns null when the page has no og:image', async () => {
		const fetchFn = (async () => new Response('<html></html>')) as FetchLike
		expect(await fetchChannelIcon('UCtest000000000000000000', fetchFn)).toBeNull()
	})

	test('returns null on request failure', async () => {
		const fetchFn = (async () => new Response('nope', { status: 404 })) as FetchLike
		expect(await fetchChannelIcon('UCtest000000000000000000', fetchFn)).toBeNull()

		const throwing = (async () => {
			throw new Error('network')
		}) as FetchLike
		expect(await fetchChannelIcon('UCtest000000000000000000', throwing)).toBeNull()
	})
})
