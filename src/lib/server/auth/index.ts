import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'

import { db } from '../db'
import * as schema from '../db/schema'
import { sendLoginCode, OTP_MAX_AGE_MINS } from '../email'

export const auth = betterAuth({
	baseURL: env.SITE_URL,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	plugins: [
		emailOTP({
			otpLength: 6,
			expiresIn: OTP_MAX_AGE_MINS * 60,
			sendVerificationOTP: async ({ email, otp }) => {
				await sendLoginCode({ email, code: otp })
			}
		}),
		sveltekitCookies(getRequestEvent)
	]
})

export type User = typeof auth.$Infer.Session.user
export type Session = typeof auth.$Infer.Session.session
