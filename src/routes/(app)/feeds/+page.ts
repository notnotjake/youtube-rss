import { getFeeds, getMaterializedFeed } from '$remotes/feeds.remote'
import type { PageLoad } from './$types'

// Warming the query here means the data ships with the server render and
// client navigations resolve before the page swaps in — no loading flash.
// The template's queries dedupe against these instances.
export const load: PageLoad = async () => {
	await Promise.all([getFeeds(), getMaterializedFeed(null)])
}
