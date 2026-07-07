import { cubicOut } from 'svelte/easing'

/**
 * @param {HTMLElement} node
 * @param {{ duration?: number, delay?: number, easing?: (t: number) => number }} params
 * @returns {import('svelte/transition').TransitionConfig}
 */
export function wipeVertical(node, { duration = 250, delay = 0, easing = cubicOut } = {}) {
	const targetHeight = node.offsetHeight
	// Get the original padding and margin values
	const originalStyles = getComputedStyle(node)
	const paddingTop = parseFloat(originalStyles.paddingTop)
	const paddingBottom = parseFloat(originalStyles.paddingBottom)
	const marginTop = parseFloat(originalStyles.marginTop)
	const marginBottom = parseFloat(originalStyles.marginBottom)
	return {
		duration,
		delay,
		easing,
		css: (/** @type {number} */ t) => `
			height: ${t * targetHeight}px;
			min-height: ${t * targetHeight}px;
			padding-top: ${t * paddingTop}px;
			padding-bottom: ${t * paddingBottom}px;
			margin-top: ${t * marginTop}px;
			margin-bottom: ${t * marginBottom}px;
			overflow: hidden;
			white-space: nowrap;
			opacity: ${t};
		`
	}
}
