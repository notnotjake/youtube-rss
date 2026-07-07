/**
 * Configuration options for an Interval
 */
export type IntervalOptions = {
	/** Interval duration in milliseconds */
	interval: number
	/** Whether to start the interval immediately upon creation */
	immediate?: boolean
	/** Whether to execute the callback immediately when starting (before first interval) */
	executeImmediately?: boolean
	/** The callback function to execute on each interval */
	callback: (tick: number, elapsed: number) => void | Promise<void>
	/** Called when the interval starts */
	onStart?: () => void
	/** Called when the interval is paused */
	onPause?: () => void
	/** Called when the interval is stopped/reset */
	onStop?: () => void
	/** Optional maximum number of ticks before auto-stopping */
	maxTicks?: number
}

export type IntervalState = 'idle' | 'running' | 'paused'

/**
 * A reactive interval class for Svelte applications with state tracking and control methods.
 * Provides a more powerful alternative to setInterval with pause/resume capabilities.
 * Uses Svelte runes for reactive state management.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { Interval } from '$lib/utils/interval.svelte'
 *
 * let count = $state(0)
 *
 * const interval = new Interval({
 *   interval: 1000, // tick every second
 *   immediate: false,
 *   executeImmediately: true,
 *   callback: (tick, elapsed) => {
 *     console.log(`Tick ${tick}, ${elapsed}ms elapsed`)
 *     count++
 *   },
 *   maxTicks: 10 // auto-stop after 10 ticks
 * })
 *
 * interval.start() // Start the interval
 * interval.pause() // Pause the interval
 * interval.resume() // Resume from paused state
 * interval.reset() // Reset to initial state
 * </script>
 *
 * <div>State: {interval.state}</div>
 * <div>Ticks: {interval.ticks}</div>
 * <div>Elapsed: {(interval.elapsed / 1000).toFixed(1)}s</div>
 * <div>Count: {count}</div>
 * ```
 */
export class Interval {
	private intervalDuration: number
	private executeImmediately: boolean
	private maxTicks?: number
	private callbacks: {
		callback: (tick: number, elapsed: number) => void | Promise<void>
		onStart?: () => void
		onPause?: () => void
		onStop?: () => void
	}

	private intervalId?: ReturnType<typeof setInterval>
	private rafId?: number
	private startTime?: number
	private pausedAt?: number
	private accumulatedTime: number = 0
	private lastTickTime: number = 0

	// Reactive state using Svelte runes
	state = $state<IntervalState>('idle')
	ticks = $state(0)
	elapsed = $state(0)
	isRunning = $derived(this.state === 'running')
	isPaused = $derived(this.state === 'paused')
	nextTickIn = $state(0)
	timeSinceLastTick = $state(0)
	averageTickDuration = $state(0)

	private tickDurations: number[] = []
	private maxDurationHistory = 10

	constructor(options: IntervalOptions) {
		this.intervalDuration = options.interval
		this.executeImmediately = options.executeImmediately ?? false
		this.maxTicks = options.maxTicks
		this.callbacks = {
			callback: options.callback,
			onStart: options.onStart,
			onPause: options.onPause,
			onStop: options.onStop
		}

		if (options.immediate) {
			this.start()
		}
	}

	/**
	 * Start the interval from the beginning
	 */
	start(): void {
		if (this.state === 'running') return

		this.reset()
		this.state = 'running'
		this.startTime = performance.now()
		this.lastTickTime = this.startTime
		this.callbacks.onStart?.()

		// Execute immediately if configured
		if (this.executeImmediately) {
			this.tick()
		}

		this.startInterval()
		this.startAnimation()
	}

	/**
	 * Pause the interval, maintaining current state
	 */
	pause(): void {
		if (this.state !== 'running') return

		this.state = 'paused'
		this.pausedAt = performance.now()
		this.accumulatedTime += this.pausedAt - this.startTime!

		this.stopInterval()
		this.stopAnimation()
		this.callbacks.onPause?.()
	}

	/**
	 * Resume the interval from paused state
	 */
	resume(): void {
		if (this.state !== 'paused') return

		this.state = 'running'
		this.startTime = performance.now()

		// Calculate remaining time until next tick
		const timeSinceLastTick = this.accumulatedTime - this.lastTickTime
		const remainingTime = this.intervalDuration - timeSinceLastTick

		// Schedule next tick with adjusted timing
		if (remainingTime > 0) {
			setTimeout(() => {
				if (this.state === 'running') {
					this.tick()
					this.startInterval()
				}
			}, remainingTime)
		} else {
			// Tick immediately if we've passed the interval time
			this.tick()
			this.startInterval()
		}

		this.startAnimation()
	}

	/**
	 * Stop the interval (alias for reset)
	 */
	stop(): void {
		this.reset()
	}

	/**
	 * Reset the interval to initial state
	 */
	reset(): void {
		this.stopInterval()
		this.stopAnimation()

		const wasRunning = this.state !== 'idle'

		this.state = 'idle'
		this.ticks = 0
		this.elapsed = 0
		this.accumulatedTime = 0
		this.startTime = undefined
		this.pausedAt = undefined
		this.lastTickTime = 0
		this.nextTickIn = 0
		this.timeSinceLastTick = 0
		this.tickDurations = []
		this.averageTickDuration = 0

		if (wasRunning) {
			this.callbacks.onStop?.()
		}
	}

	/**
	 * Manually trigger a tick (useful for testing or special cases)
	 */
	async triggerTick(): Promise<void> {
		if (this.state === 'running') {
			await this.tick()
		}
	}

	private async tick(): Promise<void> {
		const now = performance.now()
		const currentElapsed = this.accumulatedTime + (now - this.startTime!)

		// Track tick duration for averaging
		if (this.lastTickTime > 0) {
			const duration = currentElapsed - this.lastTickTime
			this.tickDurations.push(duration)
			if (this.tickDurations.length > this.maxDurationHistory) {
				this.tickDurations.shift()
			}
			this.averageTickDuration =
				this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length
		}

		this.ticks++
		this.lastTickTime = currentElapsed

		// Execute callback
		await this.callbacks.callback(this.ticks, currentElapsed)

		// Check if we've reached max ticks
		if (this.maxTicks && this.ticks >= this.maxTicks) {
			this.stop()
		}
	}

	private startInterval(): void {
		this.intervalId = setInterval(() => {
			if (this.state === 'running') {
				this.tick()
			}
		}, this.intervalDuration)
	}

	private stopInterval(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = undefined
		}
	}

	private startAnimation(): void {
		const animate = () => {
			if (this.state !== 'running') return

			const now = performance.now()
			this.elapsed = this.accumulatedTime + (now - this.startTime!)

			// Calculate time since last tick and next tick
			this.timeSinceLastTick = this.elapsed - this.lastTickTime
			this.nextTickIn = Math.max(0, this.intervalDuration - this.timeSinceLastTick)

			this.rafId = requestAnimationFrame(animate)
		}

		this.rafId = requestAnimationFrame(animate)
	}

	private stopAnimation(): void {
		if (this.rafId) {
			cancelAnimationFrame(this.rafId)
			this.rafId = undefined
		}
	}

	/**
	 * Set a new interval duration (takes effect on next tick)
	 */
	setInterval(duration: number): void {
		this.intervalDuration = duration

		// If running, restart the interval with new duration
		if (this.state === 'running') {
			this.stopInterval()
			this.startInterval()
		}
	}

	/**
	 * Get current interval configuration and state
	 */
	getSnapshot() {
		return {
			state: this.state,
			ticks: this.ticks,
			elapsed: this.elapsed,
			interval: this.intervalDuration,
			nextTickIn: this.nextTickIn,
			timeSinceLastTick: this.timeSinceLastTick,
			averageTickDuration: this.averageTickDuration
		}
	}

	/**
	 * Clean up resources (call this when disposing of the interval)
	 */
	destroy(): void {
		this.stopInterval()
		this.stopAnimation()
	}
}

/**
 * Create a new Interval instance with the provided options.
 * This is a convenience function equivalent to `new Interval(options)`.
 *
 * @param options - Configuration for the interval
 * @returns A new Interval instance
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { createInterval } from '$lib/utils/interval.svelte'
 *
 * let value = $state(0)
 *
 * const interval = createInterval({
 *   interval: 1000,
 *   callback: (tick) => {
 *     value = tick * 10
 *   },
 *   immediate: true
 * })
 * </script>
 *
 * <button onclick={() => interval.pause()}>
 *   {interval.isRunning ? 'Pause' : 'Resume'}
 * </button>
 * <div>Ticks: {interval.ticks}</div>
 * <div>Next tick in: {(interval.nextTickIn / 1000).toFixed(1)}s</div>
 * ```
 */
export function createInterval(options: IntervalOptions): Interval {
	return new Interval(options)
}

/**
 * Create and immediately start an interval that runs a specific number of times.
 * Useful for animations or timed sequences that need to run for a set duration.
 *
 * @param interval - Interval duration in milliseconds
 * @param ticks - Number of ticks to execute
 * @param callback - Callback function for each tick
 * @returns A tuple of [interval instance, promise that resolves when complete]
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { runIntervalTimes } from '$lib/utils/interval.svelte'
 *
 * async function animateSteps() {
 *   const [interval, complete] = runIntervalTimes(100, 10, (tick) => {
 *     console.log(`Step ${tick}/10`)
 *   })
 *
 *   await complete
 *   console.log('Animation complete!')
 * }
 * </script>
 * ```
 */
export function runIntervalTimes(
	interval: number,
	ticks: number,
	callback: (tick: number, elapsed: number) => void | Promise<void>
) {
	return new Promise<[Interval, Promise<void>]>((resolve) => {
		const intervalInstance = new Interval({
			interval,
			callback,
			maxTicks: ticks,
			immediate: true,
			onStop: () => {
				resolve([intervalInstance, Promise.resolve()])
			}
		})

		// Return immediately with the interval and a promise
		resolve([
			intervalInstance,
			new Promise((resolveComplete) => {
				const checkComplete = () => {
					if (intervalInstance.state === 'idle') {
						resolveComplete()
					} else {
						requestAnimationFrame(checkComplete)
					}
				}
				checkComplete()
			})
		])
	})
}
