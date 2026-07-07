type OkResult<T> = {
	isOk: true
	isError: false
	data: T
	error: null
}

type ErrResult<E> = {
	isOk: false
	isError: true
	data: null
	error: E
}

/**
 * Result shape for operations that return either success data or error
 *
 * Usage
 * `if (result.isError) { ... } else { result.data }`
 *
 * @example
 * ```ts
 * const result = await createSession()
 *
 * if (result.isError) {
 * 	throw error(500)
 * }
 *
 * return result.data.session
 * ```
 */
export type StructuredResult<T, E = unknown> = OkResult<T> | ErrResult<E>

/**
 * Builds a success result
 *
 * @param value Success value returned to callers
 * @returns Result with `isOk: true` and `error: null`
 * @example
 * ```ts
 * return ok(user)
 * ```
 */
export const ok = <T>(value: T): OkResult<T> => {
	return { isOk: true, isError: false, data: value, error: null }
}

/**
 * Builds an error result
 *
 * `err()` returns `error: true`
 * `err(value)` returns `error: value`
 *
 * @param error Optional error payload
 * @returns Result with `isError: true` and `data: null`
 * @example
 * ```ts
 * return err()
 * return err('User not found')
 * return err({ type: 'not_found', message: 'User not found' })
 * ```
 */
export function err(): ErrResult<true>
export function err<E>(error: E): ErrResult<E>
export function err<E>(error?: E) {
	if (arguments.length === 0) {
		return { isOk: false, isError: true, data: null, error: true as const }
	}

	return { isOk: false, isError: true, data: null, error }
}

/**
 * Returns success value or handles error inline
 *
 * @param result Result from an operation
 * @param onError Optional status code or error handler
 * @returns Success value from the result
 * @example
 * ```ts
 * const session = unwrap(await createSession()) // throws 500 on error
 * const user = unwrap(await getUser(), 401) // throws 401 on error
 * const passkey = unwrap(await getPasskey(), (e) => {
 * 	throw error(500, String(e))
 * }) // custom error handling
 * ```
 */
export function unwrap<T, E>(result: StructuredResult<T, E>): T
export function unwrap<T, E>(result: StructuredResult<T, E>, onError: number): T
export function unwrap<T, E>(result: StructuredResult<T, E>, onError: (error: E) => never): T
export function unwrap<T, E>(
	result: StructuredResult<T, E>,
	onError?: number | ((error: E) => never)
) {
	if (result.isError) {
		if (typeof onError === 'function') {
			return onError(result.error)
		}

		throw httpError(onError ?? 500)
	}

	return result.data
}
import { error as httpError } from '@sveltejs/kit'
