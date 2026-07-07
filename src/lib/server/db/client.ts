import { SQL } from 'bun'
import { drizzle } from 'drizzle-orm/bun-sql'
import { relations } from './relations'

/** Creates a drizzle client — kept free of $env imports so tests can construct one */
export function createDb(url: string) {
	const client = new SQL(url)
	return drizzle({ client, relations })
}

export type Db = ReturnType<typeof createDb>
