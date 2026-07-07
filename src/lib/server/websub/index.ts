import { eq } from 'drizzle-orm'
import type { FetchLike } from '../fetch'
import { env } from '$env/dynamic/private'
import type { Db } from '../db/client'
import { channels } from '../db/schema'
import { feedUrl } from '../youtube/feed-parser'
import { err, ok, type StructuredResult } from '$utils/structured-result'

export { verifyHubSignature } from './signature'

const HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe'
// YouTube's hub caps leases around 10 days; ask for the max and renew early
const LEASE_SECONDS = 828000

type Channel = typeof channels.$inferSelect

export function callbackUrl(channel: Pick<Channel, 'id' | 'websubCallbackToken'>): string {
	return `${env.SITE_URL}/api/websub/${channel.id}?t=${channel.websubCallbackToken}`
}

function isLocalOrigin(): boolean {
	return !env.SITE_URL || /localhost|127\.0\.0\.1/.test(env.SITE_URL)
}

async function sendHubRequest(
	mode: 'subscribe' | 'unsubscribe',
	channel: Channel,
	fetchFn: FetchLike
): Promise<StructuredResult<{ skipped?: true }, string>> {
	// The hub can't reach a local callback — polling covers ingestion in dev
	if (isLocalOrigin()) return ok({ skipped: true })

	const body = new URLSearchParams({
		'hub.callback': callbackUrl(channel),
		'hub.mode': mode,
		'hub.topic': feedUrl(channel.ytChannelId),
		'hub.verify': 'async',
		'hub.secret': channel.websubSecret,
		'hub.lease_seconds': String(LEASE_SECONDS)
	})

	let response: Response
	try {
		response = await fetchFn(HUB_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body
		})
	} catch {
		return err(`Network error sending ${mode} request to hub`)
	}

	if (response.status !== 202 && response.status !== 204) {
		return err(`Hub rejected ${mode}: ${response.status} ${await response.text()}`)
	}

	return ok({})
}

/**
 * Asks the hub to start pushing this channel's updates. The hub confirms
 * asynchronously with a GET to our callback (handled in api/websub), which
 * flips websubStatus to active and records the lease.
 */
export async function subscribeChannel(
	db: Db,
	channel: Channel,
	fetchFn: FetchLike = fetch
): Promise<StructuredResult<{ skipped?: true }, string>> {
	const result = await sendHubRequest('subscribe', channel, fetchFn)

	if (result.isError) {
		await db.update(channels).set({ websubStatus: 'error' }).where(eq(channels.id, channel.id))
		console.error(`[websub] subscribe failed for ${channel.ytChannelId}: ${result.error}`)
	}

	return result
}

/** Best-effort unsubscribe, used when the last feed for a channel is deleted */
export async function unsubscribeChannel(
	db: Db,
	channel: Channel,
	fetchFn: FetchLike = fetch
): Promise<void> {
	const result = await sendHubRequest('unsubscribe', channel, fetchFn)
	if (result.isError) {
		console.error(`[websub] unsubscribe failed for ${channel.ytChannelId}: ${result.error}`)
		return
	}
	await db.update(channels).set({ websubStatus: 'unsubscribed' }).where(eq(channels.id, channel.id))
}
