import type { FetchLike } from '../fetch'
import { err, ok, type StructuredResult } from '$utils/structured-result'

const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/
const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * Resolves any pasted YouTube URL (channel, @handle, /c/, /user/, watch,
 * shorts, youtu.be) to the channel's UC… id. Fetches the page when the URL
 * doesn't carry the id directly. `fetchFn` is injectable for tests.
 */
export async function resolveChannelId(
	input: string,
	fetchFn: FetchLike = fetch
): Promise<StructuredResult<{ ytChannelId: string }, string>> {
	const trimmed = input.trim()

	if (CHANNEL_ID_PATTERN.test(trimmed)) {
		return ok({ ytChannelId: trimmed })
	}

	let url: URL
	try {
		url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
	} catch {
		return err('Not a valid URL')
	}

	const host = url.hostname.replace(/^(www|m)\./, '')
	if (host !== 'youtube.com' && host !== 'youtu.be') {
		return err('Not a YouTube URL')
	}

	// Direct channel URL carries the id
	const channelMatch = url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})/)
	if (channelMatch) {
		return ok({ ytChannelId: channelMatch[1] })
	}

	// Video URLs → resolve via the watch page
	const videoId =
		host === 'youtu.be'
			? url.pathname.slice(1).split('/')[0]
			: url.pathname.match(/^\/(shorts|live|embed)\/([A-Za-z0-9_-]{11})/)?.[2] ||
				(url.pathname === '/watch' ? url.searchParams.get('v') : null)

	const pageUrl = videoId
		? `https://www.youtube.com/watch?v=${videoId}`
		: `https://www.youtube.com${url.pathname}`

	let html: string
	try {
		const response = await fetchFn(pageUrl, {
			headers: { 'user-agent': BROWSER_UA, 'accept-language': 'en' }
		})
		if (!response.ok) {
			return err(`YouTube returned ${response.status} for that URL`)
		}
		html = await response.text()
	} catch {
		return err('Network error resolving channel')
	}

	// Channel pages (@handle, /c/, /user/) expose the id via the canonical
	// link. Watch pages canonicalize to the watch URL instead, so for those
	// we read the uploader's id out of the embedded player response — the
	// canonical check first keeps recommended-content ids from matching.
	const canonical = html.match(
		/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/
	)
	if (canonical) return ok({ ytChannelId: canonical[1] })

	if (videoId) {
		const owner = html.match(/"(?:externalChannelId|channelId)":"(UC[A-Za-z0-9_-]{22})"/)
		if (owner) return ok({ ytChannelId: owner[1] })
	}

	return err('Could not find a channel for that URL')
}
