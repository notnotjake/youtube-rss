import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verifies a WebSub notification's X-Hub-Signature header — an HMAC-SHA1
 * of the raw request body keyed with the hub.secret we subscribed with.
 */
export function verifyHubSignature(
	rawBody: Uint8Array,
	signatureHeader: string | null,
	secret: string
): boolean {
	if (!signatureHeader) return false

	const [algorithm, hex] = signatureHeader.split('=')
	if (algorithm !== 'sha1' || !hex) return false

	const expected = createHmac('sha1', secret).update(rawBody).digest()
	let provided: Buffer
	try {
		provided = Buffer.from(hex, 'hex')
	} catch {
		return false
	}

	if (provided.length !== expected.length) return false
	return timingSafeEqual(provided, expected)
}
