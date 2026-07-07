import { SvelteSet } from 'svelte/reactivity'

/**
 * Represents a single action in a sequence
 */
export type SequenceAction = {
	/** The time in milliseconds when this action should execute */
	time: number
	/** The function to execute at the specified time */
	action: () => void
	/** Optional name/description for the action */
	name?: string
}

/**
 * Configuration options for a Sequence
 */
export type SequenceOptions = {
	/** Called when the sequence starts running */
	onStart?: () => void
	/** Called when all actions in the sequence have completed */
	onComplete?: () => void
	/** Called when the sequence is stopped before completion */
	onCancel?: () => void
	/** Called when an action starts executing */
	onActionStart?: (action: SequenceAction, index: number) => void
	/** Called when an action completes */
	onActionComplete?: (action: SequenceAction, index: number) => void
	/** If true, calling run() while already running will restart the sequence. Default: false */
	interruptible?: boolean
}

export type RepeatOptions = {
	/** Delay in ms between cycles. */
	delay?: number
	/** Max number of iterations. Falsey values mean infinite. */
	limit?: number
}

export type SequenceState = 'idle' | 'running' | 'completed' | 'cancelled'

/**
 * A reactive utility class for orchestrating timed sequences of actions.
 * Actions can be scheduled at specific times and the sequence can be run, stopped, and reused.
 * Uses Svelte runes for reactive state management.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { Sequence } from '$lib/utils/sequence.svelte'
 *
 * const sequence = new Sequence({
 *   onStart: () => console.log('Starting'),
 *   onComplete: () => console.log('Done'),
 *   onActionStart: (action, index) => console.log(`Action ${index} starting`),
 *   interruptible: true
 * })
 *
 * sequence
 *   .add(1000, () => console.log('After 1 second'), 'First action')
 *   .add(2000, () => console.log('After 3 seconds total'), 'Second action')
 *   .run()
 * </script>
 *
 * <div>State: {sequence.state}</div>
 * <div>Progress: {sequence.progress}%</div>
 * <div>Current action: {sequence.currentAction?.name || 'None'}</div>
 * ```
 */
export class Sequence {
	private actions: SequenceAction[] = []
	private timers: ReturnType<typeof setTimeout>[] = []
	private totalDuration = 0
	private startedAt?: number
	private completedActions = new SvelteSet<number>()

	// Reactive state using Svelte runes
	state = $state<SequenceState>('idle')
	progress = $state(0)
	elapsed = $state(0)
	currentActionIndex = $state<number | null>(null)
	currentAction = $derived(
		this.currentActionIndex !== null ? this.actions[this.currentActionIndex] : null
	)
	nextAction = $derived(() => {
		if (this.state !== 'running') return null
		const sortedActions = [...this.actions].sort((a, b) => a.time - b.time)
		const nextIndex = sortedActions.findIndex(
			(action, index) => !this.completedActions.has(index) && action.time > this.elapsed
		)
		return nextIndex >= 0 ? sortedActions[nextIndex] : null
	})
	actionsCompleted = $state(0)
	totalActions = $derived(this.actions.length)

	private rafId?: number
	private _repeatOptions: RepeatOptions | null = null
	private _currentRepeat = 0
	private options: SequenceOptions

	constructor(options: SequenceOptions = {}) {
		this.options = options
	}

	/**
	 * Add an action with a relative delay (time after the previous action).
	 * Actions are executed in the order they are added.
	 *
	 * @param delay - Time in milliseconds to wait after the previous action
	 * @param action - Function to execute
	 * @param name - Optional name/description for the action
	 * @returns The Sequence instance for chaining
	 *
	 * @example
	 * ```ts
	 * sequence
	 *   .add(1000, () => console.log('1 second'), 'First')
	 *   .add(2000, () => console.log('3 seconds total'), 'Second')
	 * ```
	 */
	add(delay: number, action: () => void, name?: string): Sequence {
		const time = this.totalDuration + delay
		this.actions.push({ time, action, name })
		this.totalDuration = time
		return this
	}

	/**
	 * Add an action at an absolute time from the start of the sequence.
	 *
	 * @param time - Absolute time in milliseconds from sequence start
	 * @param action - Function to execute
	 * @param name - Optional name/description for the action
	 * @returns The Sequence instance for chaining
	 *
	 * @example
	 * ```ts
	 * sequence
	 *   .at(1000, () => console.log('At 1 second'), 'First')
	 *   .at(500, () => console.log('At 0.5 seconds'), 'Second')
	 * ```
	 */
	at(time: number, action: () => void, name?: string): Sequence {
		this.actions.push({ time, action, name })
		// Update total duration if this action extends it
		if (time > this.totalDuration) {
			this.totalDuration = time
		}
		return this
	}

	/**
	 * Configure the sequence to repeat after completing all actions.
	 *
	 * @param options - Optional repeat configuration (delay between cycles, iteration limit)
	 * @returns The Sequence instance for chaining
	 */
	repeats(options?: RepeatOptions): Sequence {
		this._repeatOptions = options ?? {}
		return this
	}

	/**
	 * Run the sequence, executing all scheduled actions at their specified times.
	 * If the sequence is already running:
	 * - If interruptible is true, stops the current run and starts over
	 * - If interruptible is false (default), does nothing
	 *
	 * @example
	 * ```ts
	 * sequence.run()
	 * ```
	 */
	run(): void {
		if (this.state === 'running') {
			if (this.options.interruptible) {
				// Stop current sequence without calling onCancel
				this.cleanup()
			} else {
				return
			}
		}

		this.state = 'running'
		this.progress = 0
		this.elapsed = 0
		this.actionsCompleted = 0
		this.currentActionIndex = null
		this.completedActions.clear()
		this._currentRepeat = 0
		this.startedAt = performance.now()
		this.options.onStart?.()

		// Start animation for progress tracking
		this.startAnimation()
		this.scheduleActions()
	}

	/**
	 * Pause the sequence (not currently implemented, but could be added)
	 * For now, this just stops the sequence
	 */
	pause(): void {
		// TODO: Implement pause functionality similar to Timer
		// Would need to track remaining time for each action
		this.stop()
	}

	/**
	 * Stop the currently running sequence, clearing all pending timeouts.
	 * Triggers the onCancel callback if provided.
	 * The sequence can be run again after stopping.
	 *
	 * @example
	 * ```ts
	 * sequence.stop()
	 * ```
	 */
	stop(): void {
		if (this.state === 'idle' || this.state === 'completed') return

		this.cleanup()
		this.state = 'cancelled'
		this._currentRepeat = 0
		this.options.onCancel?.()
	}

	/**
	 * Stop the sequence and clear all scheduled actions.
	 * After reset, the sequence is empty and ready for new actions.
	 *
	 * @example
	 * ```ts
	 * sequence.reset()
	 * ```
	 */
	reset(): void {
		this.cleanup()
		this.state = 'idle'
		this.actions = []
		this.totalDuration = 0
		this.progress = 0
		this.elapsed = 0
		this.actionsCompleted = 0
		this.currentActionIndex = null
		this.completedActions.clear()
		this._repeatOptions = null
		this._currentRepeat = 0
	}

	/**
	 * Clear all actions but keep the sequence ready to add new ones
	 */
	clear(): void {
		this.cleanup()
		this.state = 'idle'
		this.actions = []
		this.totalDuration = 0
		this.progress = 0
		this.elapsed = 0
		this.actionsCompleted = 0
		this.currentActionIndex = null
		this.completedActions.clear()
		this._repeatOptions = null
		this._currentRepeat = 0
	}

	private scheduleActions(): void {
		const sortedActions = [...this.actions].sort((a, b) => a.time - b.time)

		sortedActions.forEach((action, index) => {
			const timer = setTimeout(() => {
				if (this.state !== 'running') return

				const originalIndex = this.actions.indexOf(action)
				this.currentActionIndex = originalIndex >= 0 ? originalIndex : null
				this.options.onActionStart?.(action, index)

				action.action()

				this.completedActions.add(index)
				this.actionsCompleted++
				this.currentActionIndex = null
				this.options.onActionComplete?.(action, index)

				if (this.actionsCompleted === this.actions.length) {
					this.handleCycleComplete()
				}
			}, action.time)

			this.timers.push(timer)
		})

		if (sortedActions.length === 0) {
			this.handleCycleComplete()
		}
	}

	private handleCycleComplete(): void {
		if (this._repeatOptions) {
			const limit = this._repeatOptions.limit
			this._currentRepeat++
			if (!limit || this._currentRepeat < limit) {
				this.startNextCycle()
				return
			}
		}
		this.complete()
	}

	private startNextCycle(): void {
		this.timers.forEach((timer) => clearTimeout(timer))
		this.timers = []
		this.actionsCompleted = 0
		this.currentActionIndex = null
		this.completedActions.clear()
		this.startedAt = performance.now()

		const delay = this._repeatOptions?.delay ?? 0
		if (delay > 0) {
			const timer = setTimeout(() => {
				if (this.state !== 'running') return
				this.scheduleActions()
			}, delay)
			this.timers.push(timer)
		} else {
			this.scheduleActions()
		}
	}

	private complete(): void {
		this.cleanup()
		this.state = 'completed'
		this.progress = 100
		this.elapsed = this.totalDuration
		this.options.onComplete?.()
	}

	private cleanup(): void {
		this.timers.forEach((timer) => clearTimeout(timer))
		this.timers = []
		this.stopAnimation()
	}

	private startAnimation(): void {
		const animate = () => {
			if (this.state !== 'running') return

			const now = performance.now()
			this.elapsed = now - this.startedAt!
			this.progress =
				this.totalDuration > 0 ? Math.min(100, (this.elapsed / this.totalDuration) * 100) : 0

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
	 * Check if the sequence is currently running.
	 *
	 * @returns true if the sequence is running, false otherwise
	 */
	isActive(): boolean {
		return this.state === 'running'
	}

	/**
	 * Get the total duration of the sequence in milliseconds.
	 *
	 * @returns The time when the last action will execute
	 */
	getDuration(): number {
		return this.totalDuration
	}

	/**
	 * Get a list of all actions in the sequence
	 */
	getActions(): ReadonlyArray<SequenceAction> {
		return this.actions
	}

	/**
	 * Clean up resources (call this when disposing of the sequence)
	 */
	destroy(): void {
		this.cleanup()
	}
}

/**
 * Create a new Sequence instance with optional configuration.
 * This is a convenience function equivalent to `new Sequence(options)`.
 *
 * @param options - Optional configuration for the sequence
 * @returns A new Sequence instance
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { createSequence } from '$lib/utils/sequence.svelte'
 *
 * const sequence = createSequence({
 *   onStart: () => console.log('Started'),
 *   onComplete: () => console.log('Completed'),
 *   onCancel: () => console.log('Cancelled'),
 *   interruptible: false
 * })
 *
 * sequence
 *   .add(1000, () => fadeIn(), 'Fade in')
 *   .add(2000, () => slideUp(), 'Slide up')
 *   .run()
 * </script>
 *
 * <div>
 *   Progress: {sequence.progress.toFixed(1)}%
 *   {#if sequence.currentAction}
 *     - {sequence.currentAction.name}
 *   {/if}
 * </div>
 * ```
 */
export function createSequence(options?: SequenceOptions): Sequence {
	return new Sequence(options)
}

/**
 * Create and immediately run a sequence with the provided actions.
 * Returns the sequence instance and a cleanup function.
 *
 * @param actions - Array of actions with their execution times
 * @param options - Optional configuration for the sequence
 * @returns A tuple of [sequence instance, cleanup function]
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { runSequence } from '$lib/utils/sequence.svelte'
 * import { onDestroy } from 'svelte'
 *
 * const [sequence, cleanup] = runSequence([
 *   { time: 1000, action: () => console.log('1s'), name: 'First' },
 *   { time: 2000, action: () => console.log('2s'), name: 'Second' }
 * ])
 *
 * onDestroy(cleanup)
 * </script>
 *
 * <div>Current: {sequence.currentAction?.name || 'None'}</div>
 * ```
 */
export function runSequence(
	actions: SequenceAction[],
	options?: SequenceOptions
): [Sequence, () => void] {
	const sequence = new Sequence(options)
	actions.forEach(({ time, action, name }) => sequence.at(time, action, name))
	sequence.run()

	// Return both the sequence and cleanup function
	return [sequence, () => sequence.stop()]
}
