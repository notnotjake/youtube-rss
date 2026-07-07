import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { building } from '$app/environment'
import { svelteKitHandler } from 'better-auth/svelte-kit'

import { auth } from '$lib/server/auth'
import { scheduledTasks } from '$lib/server/scheduled'

if (!building) scheduledTasks() // start running scheduled tasks

const handleSession: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers })
	event.locals.user = session?.user ?? null
	event.locals.session = session?.session ?? null
	return resolve(event)
}

const handleAuthRoutes: Handle = ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building })
}

export const handle: Handle = sequence(handleSession, handleAuthRoutes)
