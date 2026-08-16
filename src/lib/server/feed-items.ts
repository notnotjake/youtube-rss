import { and, desc, eq, sql } from 'drizzle-orm'

import type { Db } from '$lib/server/db'
import { channels, feedItems, feeds, videos } from '$lib/server/db/schema'

const materializedFeedSelection = {
	id: feedItems.id,
	feedId: feeds.id,
	channelTitle: channels.title,
	channelIcon: channels.iconUrl,
	ytVideoId: videos.ytVideoId,
	title: videos.title,
	thumbnailUrl: videos.thumbnailUrl,
	videoUrl: videos.videoUrl,
	isShort: videos.isShort,
	publishedAt: videos.publishedAt
}

const uniqueFeedItemSelection = {
	id: sql`${feedItems.id}`.mapWith(feedItems.id).as('feed_item_id'),
	feedId: sql`${feeds.id}`.mapWith(feeds.id).as('feed_id'),
	channelTitle: sql`${channels.title}`.mapWith(channels.title).as('channel_title'),
	channelIcon: sql`${channels.iconUrl}`.mapWith(channels.iconUrl).as('channel_icon'),
	ytVideoId: sql`${videos.ytVideoId}`.mapWith(videos.ytVideoId).as('yt_video_id'),
	title: sql`${videos.title}`.mapWith(videos.title).as('video_title'),
	thumbnailUrl: sql`${videos.thumbnailUrl}`.mapWith(videos.thumbnailUrl).as('thumbnail_url'),
	videoUrl: sql`${videos.videoUrl}`.mapWith(videos.videoUrl).as('video_url'),
	isShort: sql`${videos.isShort}`.mapWith(videos.isShort).as('is_short'),
	publishedAt: sql`${videos.publishedAt}`.mapWith(videos.publishedAt).as('published_at'),
	addedAt: sql`${feedItems.addedAt}`.mapWith(feedItems.addedAt).as('added_at')
}

/**
 * Returns a bounded homepage feed. The combined view is deduplicated in SQL
 * before the limit is applied, while a selected subscription receives its own
 * independent limit.
 */
export async function listMaterializedFeedItems(
	database: Db,
	userId: string,
	feedId: string | null,
	limit = 120
) {
	if (feedId) {
		return database
			.select(materializedFeedSelection)
			.from(feedItems)
			.innerJoin(feeds, eq(feedItems.feedId, feeds.id))
			.innerJoin(videos, eq(feedItems.videoId, videos.id))
			.innerJoin(channels, eq(feeds.channelId, channels.id))
			.where(and(eq(feeds.userId, userId), eq(feeds.id, feedId)))
			.orderBy(desc(videos.publishedAt), desc(feedItems.addedAt))
			.limit(limit)
	}

	const uniqueItems = database
		.$with('unique_feed_items')
		.as(
			database
				.selectDistinctOn([videos.ytVideoId], uniqueFeedItemSelection)
				.from(feedItems)
				.innerJoin(feeds, eq(feedItems.feedId, feeds.id))
				.innerJoin(videos, eq(feedItems.videoId, videos.id))
				.innerJoin(channels, eq(feeds.channelId, channels.id))
				.where(eq(feeds.userId, userId))
				.orderBy(videos.ytVideoId, desc(feedItems.addedAt))
		)

	return database
		.with(uniqueItems)
		.select({
			id: uniqueItems.id,
			feedId: uniqueItems.feedId,
			channelTitle: uniqueItems.channelTitle,
			channelIcon: uniqueItems.channelIcon,
			ytVideoId: uniqueItems.ytVideoId,
			title: uniqueItems.title,
			thumbnailUrl: uniqueItems.thumbnailUrl,
			videoUrl: uniqueItems.videoUrl,
			isShort: uniqueItems.isShort,
			publishedAt: uniqueItems.publishedAt
		})
		.from(uniqueItems)
		.orderBy(desc(uniqueItems.publishedAt), desc(uniqueItems.addedAt))
		.limit(limit)
}
