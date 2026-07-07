import { defineRailway, empty, github, postgres, preserve, project, service } from 'railway/iac'

export default defineRailway((ctx) => {
	const DEV = ctx.environment === 'dev'

	const Postgres = postgres('Postgres')

	const appEnv = {
		NODE_ENV: 'production',
		SITE_URL: 'https://${{RAILWAY_PUBLIC_DOMAIN}}',
		ADDRESS_HEADER: 'x-forwarded-for',
		XFF_DEPTH: '1',

		// Data
		DB_URL: Postgres.env.DATABASE_URL,

		// Secrets — set in the Railway dashboard
		BETTER_AUTH_SECRET: preserve(),
		RESEND_AUTH: preserve(),
		RESEND_FROM: preserve()
	}

	// Holds development variables; pulled locally with `bun run update:env`
	const varsDev = service('vars', {
		source: empty(),
		env: {
			...appEnv,
			NODE_ENV: 'development',
			SITE_URL: 'http://localhost:5173',
			XFF_DEPTH: '0',
			DB_URL: '' // set locally by docker:check via .env.local
		}
	})

	const app = service('app', {
		source: github('notnotjake/youtube-rss', { branch: 'main' }),
		build: { builder: 'RAILPACK' },
		start: 'bun run start',
		preDeploy: 'bun run db:migrate',
		deploy: {
			restartPolicyType: 'ALWAYS',
			restartPolicyMaxRetries: 5
		},
		healthcheck: '/health',
		replicas: 1,
		env: appEnv
	})

	if (DEV) return project('youtube-rss', { resources: [varsDev] })
	return project('youtube-rss', { resources: [app, Postgres] })
})
