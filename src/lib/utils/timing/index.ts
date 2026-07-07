// Re-export all units
export * from './units.js'

// Re-export delay utilities
export * from './delay.js'

// Re-export timer utilities
export * from './timer.svelte.js'

// Re-export interval utilities
export * from './interval.svelte.js'

// Re-export sequence utilities
export * from './sequence.svelte.js'

// Import everything for Timing namespace
import * as units from './units.js'
import * as delayUtils from './delay.js'
import * as timerUtils from './timer.svelte.js'
import * as intervalUtils from './interval.svelte.js'
import * as sequenceUtils from './sequence.svelte.js'

/**
 * Timing namespace containing all timing utilities
 *
 * @example
 * ```ts
 * import { Timing } from '$lib/utils/timing'
 *
 * // Use units
 * const duration = 5 * Timing.SECOND_IN_MS
 *
 * // Create utilities
 * const timer = new Timing.Timer({ duration: 1000 })
 * const delay = new Timing.MinimumDelay(500)
 * const interval = new Timing.Interval({ interval: 1000 })
 * const sequence = new Timing.Sequence()
 *
 * // Use functions
 * await Timing.delay(1000)
 * ```
 */
export const Timing = {
	...units,
	...delayUtils,
	...timerUtils,
	...intervalUtils,
	...sequenceUtils
} as const

// Default export
export default Timing
