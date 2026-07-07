import { spring, type Spring } from 'svelte/motion'

export interface ShakeConfig {
	/** Maximum horizontal displacement in pixels */
	amplitude: number
	/** Number of shake cycles */
	shakes: number
	/** Duration for the entire shake sequence in ms */
	duration: number
	/** Spring stiffness for shake animation */
	stiffness: number
	/** Spring damping for shake animation */
	damping: number
}

export const DEFAULT_SHAKE_CONFIG: ShakeConfig = {
	amplitude: 8,
	shakes: 3,
	duration: 400,
	stiffness: 0.3,
	damping: 0.7
}

export interface ShakeReturn {
	/** Spring for X translation */
	translateX: Spring<number>
	/** Trigger shake animation */
	triggerShake: () => void
	/** Reset spring to center */
	reset: () => void
}

/**
 * Creates reusable shake behavior for error feedback
 */
export function createShake(config: Partial<ShakeConfig> = {}): ShakeReturn {
	const finalConfig = { ...DEFAULT_SHAKE_CONFIG, ...config }

	const translateX = spring(0, {
		stiffness: finalConfig.stiffness,
		damping: finalConfig.damping
	})

	let shakeTimeout: ReturnType<typeof setTimeout> | undefined
	let shakeSequence: ReturnType<typeof setTimeout>[] = []

	const triggerShake = () => {
		// Clear any existing shake sequence
		if (shakeTimeout) {
			clearTimeout(shakeTimeout)
		}
		shakeSequence.forEach((timeout) => clearTimeout(timeout))
		shakeSequence = []

		// Calculate timing for each shake
		const shakeInterval = finalConfig.duration / (finalConfig.shakes * 2)

		// Create shake sequence
		for (let i = 0; i < finalConfig.shakes; i++) {
			// Shake to the right
			const rightTimeout = setTimeout(
				() => {
					translateX.set(finalConfig.amplitude)
				},
				i * shakeInterval * 2
			)
			shakeSequence.push(rightTimeout)

			// Shake to the left
			const leftTimeout = setTimeout(
				() => {
					translateX.set(-finalConfig.amplitude)
				},
				i * shakeInterval * 2 + shakeInterval
			)
			shakeSequence.push(leftTimeout)
		}

		// Return to center after all shakes
		shakeTimeout = setTimeout(() => {
			translateX.set(0)
			shakeSequence = []
			shakeTimeout = undefined
		}, finalConfig.duration)
	}

	const reset = () => {
		if (shakeTimeout) {
			clearTimeout(shakeTimeout)
			shakeTimeout = undefined
		}
		shakeSequence.forEach((timeout) => clearTimeout(timeout))
		shakeSequence = []
		translateX.set(0)
	}

	return {
		translateX,
		triggerShake,
		reset
	}
}
