export type RssFeedInfo = {
	title: string
	/** The YouTube channel page, used as the feed's link */
	channelUrl: string
	/** Our public URL for this feed (atom:link rel=self) */
	feedUrl: string
}

export type RssFeedItem = {
	ytVideoId: string
	title: string
	description: string
	videoUrl: string
	thumbnailUrl: string | null
	publishedAt: Date
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}

/** Linkifies URLs and preserves line breaks for the HTML body */
function descriptionHtml(item: RssFeedItem): string {
	const linked = escapeXml(item.description).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
	const paragraphs = linked.split(/\n{2,}/).map((p) => `<p>${p.replaceAll('\n', '<br/>')}</p>`)

	const thumbnail = item.thumbnailUrl
		? `<p><a href="${escapeXml(item.videoUrl)}"><img src="${escapeXml(item.thumbnailUrl)}" alt=""/></a></p>`
		: ''

	return `${thumbnail}${paragraphs.join('')}`
}

/**
 * Renders a feed's items as RSS 2.0 with media:thumbnail (for readers with
 * thumbnail support) and a content:encoded HTML body embedding the
 * thumbnail and linkified description.
 */
export function renderRssFeed(info: RssFeedInfo, items: RssFeedItem[]): string {
	const lastBuildDate = items[0]?.publishedAt ?? new Date(0)

	const itemsXml = items
		.map((item) => {
			const thumbnail = item.thumbnailUrl
				? `\n   <media:thumbnail url="${escapeXml(item.thumbnailUrl)}"/>`
				: ''
			// Readers show description as the summary; keep it plain text
			const summary =
				item.description.length > 500 ? `${item.description.slice(0, 500)}…` : item.description

			return ` <item>
  <title>${escapeXml(item.title)}</title>
  <link>${escapeXml(item.videoUrl)}</link>
  <guid isPermaLink="false">yt:video:${escapeXml(item.ytVideoId)}</guid>
  <pubDate>${item.publishedAt.toUTCString()}</pubDate>
  <description>${escapeXml(summary)}</description>
  <content:encoded><![CDATA[${descriptionHtml(item)}]]></content:encoded>${thumbnail}
 </item>`
		})
		.join('\n')

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
 <title>${escapeXml(info.title)}</title>
 <link>${escapeXml(info.channelUrl)}</link>
 <description>${escapeXml(`${info.title} — via YouTube RSS`)}</description>
 <atom:link href="${escapeXml(info.feedUrl)}" rel="self" type="application/rss+xml"/>
 <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
${itemsXml}
</channel>
</rss>
`
}
