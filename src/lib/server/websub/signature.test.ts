import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'
import { verifyHubSignature } from './signature'

const secret = 'test-secret'
const body = new TextEncoder().encode('<feed>notification body</feed>')
const validSignature = `sha1=${createHmac('sha1', secret).update(body).digest('hex')}`

describe('verifyHubSignature', () => {
	test('accepts a valid signature', () => {
		expect(verifyHubSignature(body, validSignature, secret)).toBe(true)
	})

	test('rejects a tampered body', () => {
		const tampered = new TextEncoder().encode('<feed>evil body</feed>')
		expect(verifyHubSignature(tampered, validSignature, secret)).toBe(false)
	})

	test('rejects the wrong secret', () => {
		expect(verifyHubSignature(body, validSignature, 'other-secret')).toBe(false)
	})

	test('rejects missing or malformed headers', () => {
		expect(verifyHubSignature(body, null, secret)).toBe(false)
		expect(verifyHubSignature(body, '', secret)).toBe(false)
		expect(verifyHubSignature(body, 'sha256=abcdef', secret)).toBe(false)
		expect(verifyHubSignature(body, 'sha1=', secret)).toBe(false)
		expect(verifyHubSignature(body, 'sha1=zznothex', secret)).toBe(false)
	})
})
