import { Cron } from 'croner'
import { and, isNull, lt, ne, or } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { channels } from '$lib/server/db/schema'
import { subscribeChannel } from '$lib/server/websub'
import { EVERY_6_HOURS, LEASE_RENEWAL_WINDOW_MS } from '../schedules'

async function renewExpiringLeases() {
	const renewBefore = new Date(Date.now() + LEASE_RENEWAL_WINDOW_MS)

	// Everything still wanted (not unsubscribed) with a missing or
	// soon-expiring lease — includes pending/error rows so failed
	// subscriptions retry here too
	const expiring = await db
		.select()
		.from(channels)
		.where(
			and(
				ne(channels.websubStatus, 'unsubscribed'),
				or(isNull(channels.websubLeaseExpiresAt), lt(channels.websubLeaseExpiresAt, renewBefore))
			)
		)

	if (expiring.length === 0) return
	console.log(`[SCHEDULED] Renewing ${expiring.length} WebSub lease(s)`)

	for (const channel of expiring) {
		await subscribeChannel(db, channel)
	}
}

export function scheduleWebsubRenewal() {
	const schedule = new Cron(EVERY_6_HOURS, renewExpiringLeases, { timezone: 'UTC' })
	return schedule
}
