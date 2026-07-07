import type { FetchLike } from '../fetch'

const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * Fetches a channel's avatar URL — the og:image on its channel page.
 * Returns null when the page can't be fetched or has no image.
 */
export async function fetchChannelIcon(
	ytChannelId: string,
	fetchFn: FetchLike = fetch
): Promise<string | null> {
	let html: string
	try {
		const response = await fetchFn(`https://www.youtube.com/channel/${ytChannelId}`, {
			headers: { 'user-agent': BROWSER_UA, 'accept-language': 'en' }
		})
		if (!response.ok) return null
		html = await response.text()
	} catch {
		return null
	}

	const match = html.match(/<meta property="og:image" content="([^"]+)"/)
	return match ? match[1] : null
}
