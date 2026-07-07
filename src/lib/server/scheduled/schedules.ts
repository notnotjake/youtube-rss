export const EVERY_15_MINUTES = '*/15 * * * *'
export const EVERY_6_HOURS = '0 */6 * * *'

/**
 * Channels not fetched in this window get polled. YouTube's hub drops
 * notifications often enough that polling is the delivery guarantee and
 * WebSub only the fast path — worst-case latency is roughly this window
 * plus one poll interval (~1h).
 */
export const POLL_STALE_AFTER_MS = 45 * 60 * 1000

/** Renew WebSub leases expiring within this window */
export const LEASE_RENEWAL_WINDOW_MS = 24 * 60 * 60 * 1000
