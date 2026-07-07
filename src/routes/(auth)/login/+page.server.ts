import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { site } from '$lib/site-config'

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(303, '/feeds')
	}

	return {
		title: `Welcome to ${site.name}`,
		text: 'Log in or sign up to get started'
	}
}
