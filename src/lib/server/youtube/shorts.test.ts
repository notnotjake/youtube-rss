import { describe, expect, test } from 'bun:test'
import type { FetchLike } from '../fetch'
import { isShort } from './shorts'

const neverFetch = (async () => {
	throw new Error('fetch should not be called')
}) as FetchLike

describe('isShort', () => {
	test('a /shorts/ feed link is a short without any network call', async () => {
		const result = await isShort(
			{ ytVideoId: 'm0F9Ar35WrA', link: 'https://www.youtube.com/shorts/m0F9Ar35WrA' },
			neverFetch
		)
		expect(result).toBe(true)
	})

	test('a /watch link that returns 200 on the shorts URL is a short', async () => {
		const fetchFn = (async () => new Response(null, { status: 200 })) as FetchLike
		const result = await isShort(
			{ ytVideoId: 'abcdefghijk', link: 'https://www.youtube.com/watch?v=abcdefghijk' },
			fetchFn
		)
		expect(result).toBe(true)
	})

	test('a /watch link that redirects off the shorts URL is not a short', async () => {
		const fetchFn = (async () =>
			new Response(null, {
				status: 303,
				headers: { location: 'https://www.youtube.com/watch?v=S82W3hWDvZA' }
			})) as FetchLike
		const result = await isShort(
			{ ytVideoId: 'S82W3hWDvZA', link: 'https://www.youtube.com/watch?v=S82W3hWDvZA' },
			fetchFn
		)
		expect(result).toBe(false)
	})

	test('falls back to not-a-short when the network fails', async () => {
		const result = await isShort(
			{ ytVideoId: 'S82W3hWDvZA', link: 'https://www.youtube.com/watch?v=S82W3hWDvZA' },
			neverFetch
		)
		expect(result).toBe(false)
	})
})
