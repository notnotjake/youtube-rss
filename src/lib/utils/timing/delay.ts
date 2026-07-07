/**
 * A minimum delay utility that ensures consistent response times.
 * Perfect for security-sensitive operations like password validation
 * to prevent timing attacks.
 *
 * Works on both server and client without Svelte-specific features.
 *
 * @example
 * ```ts
 * // Initialize with minimum delay time
 * const delay = new MinimumDelay(500)
 *
 * // Do your work...
 * const result = await validatePassword(password)
 *
 * // Wait for minimum time to elapse before returning
 * await delay.wait()
 * return result
 * ```
 */
export class MinimumDelay {
	private startTime: number
	private duration: number
	private timeoutId?: ReturnType<typeof setTimeout>
	private resolved = false

	constructor(duration: number) {
		this.duration = duration
		this.startTime = Date.now()
	}

	/**
	 * Wait until the minimum time has elapsed since construction
	 */
	async wait(): Promise<void> {
		if (this.resolved) return

		const elapsed = Date.now() - this.startTime
		const remaining = this.duration - elapsed

		if (remaining > 0) {
			await new Promise<void>((resolve) => {
				this.timeoutId = setTimeout(() => {
					this.resolved = true
					resolve()
				}, remaining)
			})
		} else {
			this.resolved = true
		}
	}

	/**
	 * Reset the timer with a new duration
	 */
	reset(duration?: number): void {
		this.destroy()
		this.duration = duration ?? this.duration
		this.startTime = Date.now()
		this.resolved = false
	}

	/**
	 * Get the remaining time in milliseconds
	 */
	getRemainingTime(): number {
		const elapsed = Date.now() - this.startTime
		return Math.max(0, this.duration - elapsed)
	}

	/**
	 * Clean up resources
	 */
	destroy(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId)
			this.timeoutId = undefined
		}
		this.resolved = true
	}
}

/**
 * Simple promise-based delay function for one-off delays
 *
 * @param ms - Duration to wait in milliseconds
 * @returns A promise that resolves after the specified duration
 *
 * @example
 * ```ts
 * await delay(1000) // Wait 1 second
 * console.log('Done!')
 * ```
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a minimum delay guard for consistent timing
 *
 * @param duration - Minimum duration in milliseconds
 * @returns A new MinimumDelay instance
 *
 * @example
 * ```ts
 * async function checkPassword(password: string) {
 *   const guard = createMinimumDelay(500)
 *
 *   const isValid = await validatePassword(password)
 *
 *   // Ensure at least 500ms have passed
 *   await guard.wait()
 *   return isValid
 * }
 * ```
 */
export function createMinimumDelay(duration: number): MinimumDelay {
	return new MinimumDelay(duration)
}
