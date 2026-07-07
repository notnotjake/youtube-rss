import type { FetchLike } from '../fetch'

/**
 * Detects whether a video is a YouTube Short.
 *
 * Primary signal: the channel feed links Shorts with /shorts/ URLs.
 * Fallback: a HEAD request to youtube.com/shorts/{id} — YouTube returns
 * 200 for Shorts and a 303 redirect to /watch for regular videos.
 */
export async function isShort(
	entry: { ytVideoId: string; link: string },
	fetchFn: FetchLike = fetch
): Promise<boolean> {
	if (entry.link.includes('/shorts/')) return true

	try {
		const response = await fetchFn(`https://www.youtube.com/shorts/${entry.ytVideoId}`, {
			method: 'HEAD',
			redirect: 'manual'
		})
		if (response.status >= 300 && response.status < 400) return false
		return response.ok
	} catch {
		// On network failure, trust the feed link (/watch → not a short)
		return false
	}
}
