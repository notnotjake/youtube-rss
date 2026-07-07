import { XMLParser } from 'fast-xml-parser'
import type { FetchLike } from '../fetch'
import { err, ok, type StructuredResult } from '$utils/structured-result'

export type FeedEntry = {
	ytVideoId: string
	title: string
	description: string
	thumbnailUrl: string | null
	/** The alternate link from the feed — /watch or /shorts URL */
	link: string
	publishedAt: Date
	updatedAt: Date
}

export type ParsedChannelFeed = {
	ytChannelId: string
	title: string
	channelUrl: string
	entries: FeedEntry[]
}

export function feedUrl(ytChannelId: string): string {
	return `https://www.youtube.com/feeds/videos.xml?channel_id=${ytChannelId}`
}

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_'
})

function asArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined) return []
	return Array.isArray(value) ? value : [value]
}

/**
 * Parses a YouTube channel Atom feed (videos.xml) including the media:group
 * extensions that carry each video's thumbnail and full description.
 */
export function parseChannelFeed(xml: string): StructuredResult<ParsedChannelFeed, string> {
	let doc: Record<string, unknown>
	try {
		doc = parser.parse(xml)
	} catch {
		return err('Failed to parse feed XML')
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const feed = (doc as any).feed
	if (!feed) return err('Not an Atom feed')

	const ytChannelId: string | undefined = feed['yt:channelId']
	const title: string | undefined = feed.title
	if (!ytChannelId || !title) return err('Feed missing channel id or title')

	// The channel id element omits the UC prefix in some feeds — normalize
	const fullChannelId = ytChannelId.startsWith('UC') ? ytChannelId : `UC${ytChannelId}`

	const links = asArray(feed.link)
	const alternate = links.find((l) => l['@_rel'] === 'alternate')
	const channelUrl: string =
		alternate?.['@_href'] || `https://www.youtube.com/channel/${fullChannelId}`

	const entries: FeedEntry[] = []
	for (const entry of asArray(feed.entry)) {
		const ytVideoId: string | undefined = entry['yt:videoId']
		const entryLinks = asArray(entry.link)
		const entryAlternate = entryLinks.find((l) => l['@_rel'] === 'alternate')
		const link: string | undefined = entryAlternate?.['@_href']
		if (!ytVideoId || !link) continue

		const media = entry['media:group']
		const description =
			typeof media?.['media:description'] === 'string' ? media['media:description'] : ''
		const thumbnailUrl: string | null = media?.['media:thumbnail']?.['@_url'] || null

		entries.push({
			ytVideoId: String(ytVideoId),
			title: String(entry.title ?? media?.['media:title'] ?? ''),
			description: String(description),
			thumbnailUrl,
			link,
			publishedAt: new Date(entry.published),
			updatedAt: new Date(entry.updated ?? entry.published)
		})
	}

	return ok({
		ytChannelId: fullChannelId,
		title: String(title),
		channelUrl,
		entries
	})
}

/** Fetches and parses a channel's feed. `fetchFn` is injectable for tests. */
export async function fetchChannelFeed(
	ytChannelId: string,
	fetchFn: FetchLike = fetch
): Promise<StructuredResult<ParsedChannelFeed, string>> {
	let response: Response
	try {
		response = await fetchFn(feedUrl(ytChannelId))
	} catch {
		return err('Network error fetching channel feed')
	}

	if (!response.ok) {
		return err(`Channel feed returned ${response.status}`)
	}

	return parseChannelFeed(await response.text())
}
