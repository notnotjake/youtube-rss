import { defineRelations } from 'drizzle-orm'
import * as schema from './schema/index'

export const relations = defineRelations(schema, (r) => ({
	channels: {
		videos: r.many.videos({
			from: r.channels.id,
			to: r.videos.channelId
		}),
		feeds: r.many.feeds({
			from: r.channels.id,
			to: r.feeds.channelId
		})
	},
	videos: {
		channel: r.one.channels({
			from: r.videos.channelId,
			to: r.channels.id
		})
	},
	feeds: {
		user: r.one.user({
			from: r.feeds.userId,
			to: r.user.id
		}),
		channel: r.one.channels({
			from: r.feeds.channelId,
			to: r.channels.id
		}),
		rules: r.many.feedRules({
			from: r.feeds.id,
			to: r.feedRules.feedId
		}),
		items: r.many.feedItems({
			from: r.feeds.id,
			to: r.feedItems.feedId
		})
	},
	feedRules: {
		feed: r.one.feeds({
			from: r.feedRules.feedId,
			to: r.feeds.id
		})
	},
	feedItems: {
		feed: r.one.feeds({
			from: r.feedItems.feedId,
			to: r.feeds.id
		}),
		video: r.one.videos({
			from: r.feedItems.videoId,
			to: r.videos.id
		})
	}
}))
