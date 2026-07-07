#!/usr/bin/env bun
/**
 * Dev utility: adds a feed for a user straight through the server pipeline
 * (resolve → ingest → seed), same as the UI's addFeed remote function.
 *
 * Usage: bun scripts/dev-add-feed.ts <youtube-url> [email]
 */

import { eq } from 'drizzle-orm'
import { createDb } from '../src/lib/server/db/client'
import { channels, feeds, user } from '../src/lib/server/db/schema'
import { resolveChannelId } from '../src/lib/server/youtube/resolve'
import { fetchChannelFeed } from '../src/lib/server/youtube/feed-parser'
import { ingestChannel, seedFeedItems } from '../src/lib/server/ingest'

const url = process.argv[2]
const email = process.argv[3] || 'dev@example.com'

if (!url) {
	console.error('Usage: bun scripts/dev-add-feed.ts <youtube-url> [email]')
	process.exit(1)
}
if (!process.env.DB_URL) {
	console.error('DB_URL is not set — run: bun run docker:start')
	process.exit(1)
}

const db = createDb(process.env.DB_URL)

let [owner] = await db.select().from(user).where(eq(user.email, email))
if (!owner) {
	;[owner] = await db.insert(user).values({ id: crypto.randomUUID(), name: '', email }).returning()
	console.log(`Created user ${email}`)
}

const resolved = await resolveChannelId(url)
if (resolved.isError) {
	console.error(`Could not resolve channel: ${resolved.error}`)
	process.exit(1)
}
console.log(`Resolved channel: ${resolved.data.ytChannelId}`)

let [channel] = await db
	.select()
	.from(channels)
	.where(eq(channels.ytChannelId, resolved.data.ytChannelId))

if (!channel) {
	const feedResult = await fetchChannelFeed(resolved.data.ytChannelId)
	if (feedResult.isError) {
		console.error(`Could not fetch channel feed: ${feedResult.error}`)
		process.exit(1)
	}
	;[channel] = await db
		.insert(channels)
		.values({
			ytChannelId: feedResult.data.ytChannelId,
			title: feedResult.data.title,
			channelUrl: feedResult.data.channelUrl
		})
		.returning()
	console.log(`Created channel: ${channel.title}`)

	const ingest = await ingestChannel(db, channel.id)
	if (ingest.isError) {
		console.error(`Ingest failed: ${ingest.error}`)
		process.exit(1)
	}
	console.log(`Ingested ${ingest.data.newVideos} videos`)
}

const [feed] = await db
	.insert(feeds)
	.values({ userId: owner.id, channelId: channel.id })
	.returning()
const seeded = await seedFeedItems(db, feed.id)

console.log(`Feed created with ${seeded} items (Shorts excluded by default)`)
console.log(`Feed URL: http://localhost:5173/f/${feed.token}.xml`)
process.exit(0)
