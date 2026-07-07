import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
	const homepageIntentCookie = event.cookies.get('homepageIntent')
	const homepageIntentUrl = event.url.searchParams.has('homepage')
	const authedUser = !!event.locals.user

	// Redirect a logged in user straight to their feeds
	// unless they've explicitly asked for the homepage
	if (authedUser && !homepageIntentCookie && !homepageIntentUrl) {
		redirect(303, '/feeds')
	}

	// Set cookie for subsequent requests
	if (homepageIntentUrl) {
		event.cookies.set('homepageIntent', 'true', {
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 90, // 90 mins
			path: '/'
		})
	}

	return {
		loggedIn: authedUser
	}
}
