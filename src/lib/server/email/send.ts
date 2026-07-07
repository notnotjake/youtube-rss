import type { CreateEmailOptions } from 'resend'
import { Resend } from 'resend'

import { err, ok, type StructuredResult } from '$utils/structured-result'
import { NODE_ENV, RESEND_AUTH, RESEND_FROM } from '$env/static/private'

const IS_DEV = NODE_ENV === 'development'
const SEND_IN_DEV = false // Set true to override and send emails in dev

const resend = new Resend(RESEND_AUTH)

type SendEmailOptions = Omit<CreateEmailOptions, 'from'> & {
	from?: CreateEmailOptions['from']
}

/**
 * Sends a transactional email through Resend with a default sender.
 * @param options Email payload fields accepted by Resend. `from` is optional and defaults to `RESEND_FROM`.
 * @param devMessage Message logged when email sending is suppressed during local development.
 * @returns Structured response with the sent email id when available.
 * @example
 * await sendEmail({ to: 'user@example.com', subject: 'Welcome', react: Template() }, 'Sent welcome')
 */
export async function sendEmail(options: SendEmailOptions, devMessage: string | undefined | null) {
	// Apply module-level defaults, then allow callers to override specific fields.
	const emailOptions = { from: RESEND_FROM, ...options } as CreateEmailOptions

	// Skip external sends in development unless explicitly overridden above.
	if (IS_DEV && !SEND_IN_DEV) {
		console.log(devMessage || 'Email suppressed in dev without console message')
		return ok({ id: 'dev-simulated-send' })
	}

	// Call Resend send
	const { error, data } = await resend.emails.send(emailOptions)

	if (error) {
		console.log(error)
		return err(error)
	}

	return ok({ id: data?.id })
}

export type EmailSendResponse = StructuredResult<{ id: string | undefined }, unknown>
