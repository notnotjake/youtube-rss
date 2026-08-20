import { DB_URL } from '$app/env/private'
import { createDb } from './client'

if (!DB_URL) throw new Error('DB_URL is not set')

export const db = createDb(DB_URL)
export type { Db } from './client'
