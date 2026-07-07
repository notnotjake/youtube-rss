import { defineConfig } from 'drizzle-kit'

if (!process.env.DB_URL) throw new Error('DB_URL is not set')

export default defineConfig({
	out: './db/migrations',
	schema: './src/lib/server/db/schema/index.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DB_URL },
	verbose: true,
	strict: true
})
