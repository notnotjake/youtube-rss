import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Feeds moved from /f/ to /rss/ — keep old subscription URLs working
export const GET: RequestHandler = ({ params }) => {
	redirect(301, `/rss/${params.token}.xml`)
}
