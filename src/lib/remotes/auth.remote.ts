import { form, getRequestEvent } from '$app/server'
import { error, redirect } from '@sveltejs/kit'
import * as v from 'valibot'
import { auth } from '$lib/server/auth'

const identifierField = v.pipe(v.string(), v.trim(), v.email('Invalid email'))

async function sendCode(email: string) {
	try {
		await auth.api.sendVerificationOTP({ body: { email, type: 'sign-in' } })
	} catch (e) {
		console.error('Failed to send login code', e)
		error(500, 'Could not send the login code')
	}
}

/** First login step — sends a 6-digit code to the given email */
export const startLogin = form(
	v.object({ identifier: identifierField }),
	async ({ identifier }) => {
		await sendCode(identifier)
		return { identifier, codeSent: true }
	}
)

/** Resends the code during the second step */
export const sendLoginCode = form(
	v.object({ identifier: identifierField }),
	async ({ identifier }) => {
		await sendCode(identifier)
		return { success: true }
	}
)

/** Second step — verifies the code and creates the session cookie */
export const verifyLoginCode = form(
	v.object({
		identifier: identifierField,
		code: v.pipe(v.string(), v.trim(), v.length(6))
	}),
	async ({ identifier, code }) => {
		const event = getRequestEvent()

		try {
			await auth.api.signInEmailOTP({
				body: { email: identifier, otp: code },
				headers: event.request.headers
			})
		} catch {
			return { success: false as const }
		}

		// Redirecting from the form lets SvelteKit navigate cleanly (and
		// refresh loads/queries) instead of a hard window.location jump
		redirect(303, '/feeds')
	}
)
