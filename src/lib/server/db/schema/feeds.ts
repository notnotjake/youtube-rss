import { randomUUID, randomBytes } from 'node:crypto'
import { pgTable, pgEnum, text, timestamp, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { user } from './auth'

/**
 * A YouTube channel we track. Shared across users — one WebSub
 * subscription and one video store per channel.
 */
export const channels = pgTable('channels', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	ytChannelId: text('yt_channel_id').notNull().unique(),
	title: text('title').notNull(),
	channelUrl: text('channel_url').notNull(),
	// HMAC secret for WebSub notification signatures (hub.secret)
	websubSecret: text('websub_secret')
		.notNull()
		.$defaultFn(() => randomBytes(24).toString('base64url')),
	// Unguessable token embedded in the callback URL for this channel
	websubCallbackToken: text('websub_callback_token')
		.notNull()
		.$defaultFn(() => randomBytes(18).toString('base64url')),
	websubStatus: text('websub_status', {
		enum: ['pending', 'active', 'error', 'unsubscribed']
	})
		.notNull()
		.default('pending'),
	websubLeaseExpiresAt: timestamp('websub_lease_expires_at', {
		mode: 'date',
		withTimezone: true
	}),
	lastPolledAt: timestamp('last_polled_at', { mode: 'date', withTimezone: true }),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow()
})

/**
 * Every video we've seen from a tracked channel, Shorts included.
 * Feed membership is decided per-feed in feedItems.
 */
export const videos = pgTable(
	'videos',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		channelId: text('channel_id')
			.notNull()
			.references(() => channels.id, { onDelete: 'cascade' }),
		ytVideoId: text('yt_video_id').notNull().unique(),
		title: text('title').notNull(),
		description: text('description').notNull().default(''),
		thumbnailUrl: text('thumbnail_url'),
		videoUrl: text('video_url').notNull(),
		isShort: boolean('is_short').notNull().default(false),
		publishedAt: timestamp('published_at', { mode: 'date', withTimezone: true }).notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('videos_channel_published_idx').on(table.channelId, table.publishedAt)]
)

/**
 * A user's filtered feed for one channel — the thing an RSS reader
 * subscribes to at /f/[token].xml
 */
export const feeds = pgTable('feeds', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	channelId: text('channel_id')
		.notNull()
		.references(() => channels.id, { onDelete: 'cascade' }),
	// Unguessable public URL slug
	token: text('token')
		.notNull()
		.unique()
		.$defaultFn(() => randomBytes(18).toString('base64url')),
	title: text('title'),
	includeShorts: boolean('include_shorts').notNull().default(false),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow()
})

export const feedRuleType = pgEnum('feed_rule_type', ['exclude', 'require'])
export const feedRuleMatch = pgEnum('feed_rule_match', ['title', 'description', 'both'])

/** Keyword rule on a feed, applied to videos as they are ingested */
export const feedRules = pgTable('feed_rules', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	feedId: text('feed_id')
		.notNull()
		.references(() => feeds.id, { onDelete: 'cascade' }),
	type: feedRuleType('type').notNull(),
	match: feedRuleMatch('match').notNull().default('title'),
	value: text('value').notNull(),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow()
})

/**
 * Materialized feed membership. Written once when a video is ingested,
 * evaluated against the feed's settings at that moment — later settings
 * changes never back-edit published feeds.
 */
export const feedItems = pgTable(
	'feed_items',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		feedId: text('feed_id')
			.notNull()
			.references(() => feeds.id, { onDelete: 'cascade' }),
		videoId: text('video_id')
			.notNull()
			.references(() => videos.id, { onDelete: 'cascade' }),
		addedAt: timestamp('added_at', { mode: 'date', withTimezone: true }).notNull().defaultNow()
	},
	(table) => [uniqueIndex('feed_items_feed_video_idx').on(table.feedId, table.videoId)]
)
