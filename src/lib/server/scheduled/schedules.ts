export const EVERY_1_HOUR = '0 * * * *'
export const EVERY_6_HOURS = '0 */6 * * *'

/** Channels not fetched in this window get polled — keeps "at least daily" with margin */
export const POLL_STALE_AFTER_MS = 12 * 60 * 60 * 1000

/** Renew WebSub leases expiring within this window */
export const LEASE_RENEWAL_WINDOW_MS = 24 * 60 * 60 * 1000
