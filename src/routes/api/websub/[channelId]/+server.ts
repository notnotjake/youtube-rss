import { eq } from 'drizzle-orm'
import type { RequestHandler } from './$types'

import { db } from '$lib/server/db'
import { channels } from '$lib/server/db/schema'
import { verifyHubSignature } from '$lib/server/websub'
import { feedUrl } from '$lib/server/youtube/feed-parser'
import { ingestChannel } from '$lib/server/ingest'

async function findChannel(channelId: string, callbackToken: string | null) {
	if (!callbackToken) return null
	const [channel] = await db.select().from(channels).where(eq(channels.id, channelId))
	if (!channel || channel.websubCallbackToken !== callbackToken) return null
	return channel
}

/** Hub subscription verification — echo the challenge to confirm intent */
export const GET: RequestHandler = async ({ params, url }) => {
	const channel = await findChannel(params.channelId, url.searchParams.get('t'))
	if (!channel) return new Response('not found', { status: 404 })

	const mode = url.searchParams.get('hub.mode')
	const topic = url.searchParams.get('hub.topic')
	const challenge = url.searchParams.get('hub.challenge')

	if (!challenge || topic !== feedUrl(channel.ytChannelId)) {
		return new Response('bad request', { status: 400 })
	}

	if (mode === 'subscribe') {
		const leaseSeconds = parseInt(url.searchParams.get('hub.lease_seconds') || '0', 10)
		await db
			.update(channels)
			.set({
				websubStatus: 'active',
				websubLeaseExpiresAt: leaseSeconds ? new Date(Date.now() + leaseSeconds * 1000) : null
			})
			.where(eq(channels.id, channel.id))
		return new Response(challenge)
	}

	if (mode === 'unsubscribe') {
		await db
			.update(channels)
			.set({ websubStatus: 'unsubscribed', websubLeaseExpiresAt: null })
			.where(eq(channels.id, channel.id))
		return new Response(challenge)
	}

	return new Response('bad request', { status: 400 })
}

/**
 * Content notification. The payload is unreliable (missing descriptions,
 * sometimes stale), so it's treated purely as a trigger: verify the HMAC,
 * ack fast, and refetch the real channel feed.
 */
export const POST: RequestHandler = async ({ params, url, request }) => {
	const channel = await findChannel(params.channelId, url.searchParams.get('t'))
	if (!channel) return new Response('not found', { status: 404 })

	const rawBody = new Uint8Array(await request.arrayBuffer())
	const signature = request.headers.get('x-hub-signature')

	if (!verifyHubSignature(rawBody, signature, channel.websubSecret)) {
		// Per the WebSub spec, acknowledge but ignore bad signatures so the
		// hub doesn't retry a request we'll never accept
		return new Response(null, { status: 204 })
	}

	// Ack before the ingest fetches run; polling backstops any failure here
	ingestChannel(db, channel.id).then((result) => {
		if (result.isError) {
			console.error(
				`[websub] ingest after notify failed for ${channel.ytChannelId}: ${result.error}`
			)
		} else if (result.data.newVideos > 0) {
			console.log(
				`[websub] ${channel.title}: +${result.data.newVideos} videos, ${result.data.feedItemsAdded} feed items`
			)
		}
	})

	return new Response(null, { status: 204 })
}
