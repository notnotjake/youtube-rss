import { error } from '@sveltejs/kit'
import { desc, eq } from 'drizzle-orm'
import type { RequestHandler } from './$types'

import { env } from '$env/dynamic/private'
import { db } from '$lib/server/db'
import { channels, feeds, feedItems, videos } from '$lib/server/db/schema'
import { renderRssFeed } from '$lib/server/rss/render'

export const GET: RequestHandler = async ({ params }) => {
	const [row] = await db
		.select({ feed: feeds, channel: channels })
		.from(feeds)
		.innerJoin(channels, eq(feeds.channelId, channels.id))
		.where(eq(feeds.token, params.token))
	if (!row) error(404, 'Feed not found')

	const items = await db
		.select({ video: videos })
		.from(feedItems)
		.innerJoin(videos, eq(feedItems.videoId, videos.id))
		.where(eq(feedItems.feedId, row.feed.id))
		.orderBy(desc(videos.publishedAt))
		.limit(50)

	const xml = renderRssFeed(
		{
			title: row.feed.title ?? row.channel.title,
			channelUrl: row.channel.channelUrl,
			feedUrl: `${env.SITE_URL}/f/${row.feed.token}.xml`
		},
		items.map(({ video }) => ({
			ytVideoId: video.ytVideoId,
			title: video.title,
			description: video.description,
			videoUrl: video.videoUrl,
			thumbnailUrl: video.thumbnailUrl,
			publishedAt: video.publishedAt
		}))
	)

	return new Response(xml, {
		headers: {
			'content-type': 'application/rss+xml; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	})
}
