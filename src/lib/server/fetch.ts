/**
 * Minimal fetch shape used for dependency injection — modules that call
 * YouTube take this instead of `typeof fetch` so tests can pass plain
 * async functions without casting.
 */
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>
