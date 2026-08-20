import type { User, Session } from '#lib/server/auth/index.ts'

declare global {
	namespace App {
		interface Locals {
			user: User | null
			session: Session | null
		}
	}
}

export {}
