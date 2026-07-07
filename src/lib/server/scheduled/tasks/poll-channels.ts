import { Cron } from 'croner'
import { isNull, lt, or } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { channels } from '$lib/server/db/schema'
import { ingestChannel } from '$lib/server/ingest'
import { EVERY_1_HOUR, POLL_STALE_AFTER_MS } from '../schedules'

async function pollStaleChannels() {
	const staleBefore = new Date(Date.now() - POLL_STALE_AFTER_MS)
	const stale = await db
		.select({ id: channels.id, ytChannelId: channels.ytChannelId })
		.from(channels)
		.where(or(isNull(channels.lastPolledAt), lt(channels.lastPolledAt, staleBefore)))

	if (stale.length === 0) return
	console.log(`[SCHEDULED] Polling ${stale.length} stale channel(s)`)

	// Sequential on purpose — keeps request rate to YouTube polite
	for (const channel of stale) {
		const result = await ingestChannel(db, channel.id)
		if (result.isError) {
			console.error(`[SCHEDULED] Poll failed for ${channel.ytChannelId}: ${result.error}`)
		} else if (result.data.newVideos > 0) {
			console.log(
				`[SCHEDULED] ${channel.ytChannelId}: +${result.data.newVideos} videos, ${result.data.feedItemsAdded} feed items`
			)
		}
	}
}

export function schedulePollChannels() {
	const schedule = new Cron(EVERY_1_HOUR, pollStaleChannels, { timezone: 'UTC' })
	return schedule
}
