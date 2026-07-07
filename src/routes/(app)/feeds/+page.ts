import { getFeeds } from '$remotes/feeds.remote'
import type { PageLoad } from './$types'

// Warming the query here means the data ships with the server render and
// client navigations resolve before the page swaps in — no loading flash.
// The template's `await getFeeds()` dedupes against this instance.
export const load: PageLoad = async () => {
	await getFeeds()
}
