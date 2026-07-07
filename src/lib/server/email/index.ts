import { sendEmail } from './send'
import AuthCode from './templates/auth-code'

export const OTP_MAX_AGE_MINS = 10

/** Sends the 6-digit login code email. In dev the code is logged instead. */
export async function sendLoginCode({ email, code }: { email: string; code: string }) {
	const result = await sendEmail(
		{
			to: email,
			subject: `${code} is your login code`,
			react: AuthCode({ code, maxAgeMins: OTP_MAX_AGE_MINS })
		},
		`Login code for ${email}: ${code}`
	)

	if (result.isError) throw new Error('Failed to send login code email')
}
