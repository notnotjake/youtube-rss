import { env } from '$env/dynamic/private'
import { createDb } from './client'

if (!env.DB_URL) throw new Error('DB_URL is not set')

export const db = createDb(env.DB_URL)
export type { Db } from './client'
