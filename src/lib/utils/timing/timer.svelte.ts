import { SvelteDate } from 'svelte/reactivity'

/**
 * Configuration options for a Timer
 */
export type TimerOptions = {
	/** Duration of the timer - can be:
	 * - number: duration in milliseconds
	 * - { seconds: number }: duration in seconds
	 * - { endTime: Date | string | number }: specific end time
	 */
	duration: number | { seconds: number } | { endTime: Date | string | number }
	/** Interval for tick callbacks in milliseconds (default: 100ms) */
	interval?: number
	/** Whether to start the timer immediately upon creation */
	immediate?: boolean
	/** Called on every tick with current time elapsed */
	onTick?: (elapsed: number, remaining: number) => void
	/** Called when the timer starts */
	onStart?: () => void
	/** Called when the timer is paused */
	onPause?: () => void
	/** Called when the timer completes */
	onComplete?: () => void
	/** Called when the timer is reset */
	onReset?: () => void
}

export type TimerState = 'idle' | 'running' | 'paused' | 'completed'

/**
 * A reactive timer class for Svelte applications with state tracking and callbacks.
 * Uses Svelte runes for reactive state management.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { Timer } from '$lib/utils/timer.svelte'
 *
 * const timer = new Timer({
 *   duration: 5000, // 5 seconds in milliseconds
 *   // OR duration: { seconds: 5 }, // 5 seconds
 *   // OR duration: { endTime: new Date(Date.now() + 10000) }, // 10 seconds from now
 *   interval: 100, // tick every 100ms
 *   immediate: false,
 *   onTick: (elapsed, remaining) => console.log(`${elapsed}ms elapsed, ${remaining}ms remaining`),
 *   onComplete: () => console.log('Timer complete!')
 * })
 *
 * timer.start() // Start the timer
 * timer.pause() // Pause the timer
 * timer.resume() // Resume from paused state
 * timer.reset() // Reset to initial state
 * </script>
 *
 * <div>Progress: {timer.progress}%</div>
 * <div>State: {timer.state}</div>
 * ```
 */
export class Timer {
	private duration: number
	private interval: number
	private callbacks: {
		onTick?: (elapsed: number, remaining: number) => void
		onStart?: () => void
		onPause?: () => void
		onComplete?: () => void
		onReset?: () => void
	}

	private rafId?: number
	private tickInterval?: ReturnType<typeof setInterval>
	private startTime?: number
	private pausedAt?: number
	private accumulatedTime: number = 0

	// Reactive state using Svelte runes
	state = $state<TimerState>('idle')
	elapsed = $state(0)
	remaining = $state(0)
	progress = $state(0)

	constructor(options: TimerOptions) {
		this.duration = this.parseDuration(options.duration)
		this.interval = options.interval ?? 100
		this.callbacks = {
			onTick: options.onTick,
			onStart: options.onStart,
			onPause: options.onPause,
			onComplete: options.onComplete,
			onReset: options.onReset
		}

		this.remaining = this.duration

		if (options.immediate) {
			this.start()
		}
	}

	/**
	 * Start the timer from the beginning or from a specific time
	 * @param startFrom - Optional time in milliseconds to start from
	 */
	start(startFrom: number = 0): void {
		if (this.state === 'running') return

		this.reset()
		this.state = 'running'
		this.startTime = performance.now()
		this.accumulatedTime = Math.min(startFrom, this.duration)

		// Update initial values if starting from a specific time
		if (startFrom > 0) {
			this.updateValues(this.accumulatedTime)
		}

		this.callbacks.onStart?.()

		this.startAnimation()
		this.startTickInterval()
	}

	/**
	 * Pause the timer, maintaining current progress
	 */
	pause(): void {
		if (this.state !== 'running') return

		this.state = 'paused'
		this.pausedAt = performance.now()
		this.accumulatedTime += this.pausedAt - this.startTime!

		this.stopAnimation()
		this.stopTickInterval()
		this.callbacks.onPause?.()
	}

	/**
	 * Resume the timer from paused state
	 */
	resume(): void {
		if (this.state !== 'paused') return

		this.state = 'running'
		this.startTime = performance.now()

		this.startAnimation()
		this.startTickInterval()
	}

	/**
	 * Reset the timer to initial state
	 */
	reset(): void {
		this.stopAnimation()
		this.stopTickInterval()

		this.state = 'idle'
		this.elapsed = 0
		this.remaining = this.duration
		this.progress = 0
		this.accumulatedTime = 0
		this.startTime = undefined
		this.pausedAt = undefined

		this.callbacks.onReset?.()
	}

	/**
	 * Stop the timer (alias for reset)
	 */
	stop(): void {
		this.reset()
	}

	private startAnimation(): void {
		const animate = () => {
			if (this.state !== 'running') return

			const now = performance.now()
			const currentElapsed = this.accumulatedTime + (now - this.startTime!)

			this.updateValues(currentElapsed)

			if (currentElapsed >= this.duration) {
				this.complete()
				return
			}

			this.rafId = requestAnimationFrame(animate)
		}

		this.rafId = requestAnimationFrame(animate)
	}

	private startTickInterval(): void {
		// Immediate tick
		this.tick()

		this.tickInterval = setInterval(() => {
			if (this.state === 'running') {
				this.tick()
			}
		}, this.interval)
	}

	private tick(): void {
		const now = performance.now()
		const currentElapsed = this.accumulatedTime + (now - this.startTime!)
		this.callbacks.onTick?.(
			Math.min(currentElapsed, this.duration),
			Math.max(0, this.duration - currentElapsed)
		)
	}

	private updateValues(currentElapsed: number): void {
		this.elapsed = Math.min(currentElapsed, this.duration)
		this.remaining = Math.max(0, this.duration - currentElapsed)
		this.progress = Math.min(100, (currentElapsed / this.duration) * 100)
	}

	private complete(): void {
		this.state = 'completed'
		this.elapsed = this.duration
		this.remaining = 0
		this.progress = 100

		this.stopAnimation()
		this.stopTickInterval()
		this.callbacks.onComplete?.()
	}

	private stopAnimation(): void {
		if (this.rafId) {
			cancelAnimationFrame(this.rafId)
			this.rafId = undefined
		}
	}

	private stopTickInterval(): void {
		if (this.tickInterval) {
			clearInterval(this.tickInterval)
			this.tickInterval = undefined
		}
	}

	/**
	 * Parse duration input to milliseconds
	 */
	private parseDuration(
		duration: number | { seconds: number } | { endTime: Date | string | number }
	): number {
		if (typeof duration === 'number') {
			return duration
		}

		if ('seconds' in duration) {
			return duration.seconds * 1000
		}

		if ('endTime' in duration) {
			const endTime =
				duration.endTime instanceof Date
					? duration.endTime.getTime()
					: typeof duration.endTime === 'string'
						? new SvelteDate(duration.endTime).getTime()
						: duration.endTime

			const now = Date.now()
			const diff = endTime - now

			if (diff <= 0) {
				throw new Error('End time must be in the future')
			}

			return diff
		}

		throw new Error('Invalid duration format')
	}

	/**
	 * Clean up resources (call this when disposing of the timer)
	 */
	destroy(): void {
		this.stopAnimation()
		this.stopTickInterval()
	}

	/**
	 * Get current timer values as a snapshot
	 */
	getSnapshot() {
		return {
			state: this.state,
			elapsed: this.elapsed,
			remaining: this.remaining,
			progress: this.progress,
			duration: this.duration
		}
	}
}

/**
 * Create a new Timer instance with the provided options.
 * This is a convenience function equivalent to `new Timer(options)`.
 *
 * @param options - Configuration for the timer
 * @returns A new Timer instance
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { createTimer } from '$lib/utils/timer.svelte'
 *
 * const timer = createTimer({
 *   duration: 10000, // 10 seconds in milliseconds
 *   // OR duration: { seconds: 10 },
 *   // OR duration: { endTime: '2024-12-25T00:00:00' },
 *   onComplete: () => console.log('Done!'),
 *   immediate: true
 * })
 * </script>
 *
 * <div>Progress: {timer.progress}%</div>
 * ```
 */
export function createTimer(options: TimerOptions): Timer {
	return new Timer(options)
}
