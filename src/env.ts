import { defineEnvVars } from '@sveltejs/kit/env'

export const variables = defineEnvVars({
	BETTER_AUTH_SECRET: {},
	DB_URL: {},
	NODE_ENV: { static: true },
	RESEND_AUTH: { static: true },
	RESEND_FROM: { static: true },
	SITE_URL: {}
})
