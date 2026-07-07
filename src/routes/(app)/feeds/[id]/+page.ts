import { getFeed } from '$remotes/feeds.remote'
import type { PageLoad } from './$types'

// Warm the feed detail query so navigation lands with data (see ../+page.ts)
export const load: PageLoad = async ({ params }) => {
	await getFeed(params.id)
}
