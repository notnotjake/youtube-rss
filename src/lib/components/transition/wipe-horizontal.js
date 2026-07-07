import { cubicOut } from 'svelte/easing'

/**
 * @param {HTMLElement} node
 * @param {{ duration?: number, delay?: number, easing?: (t: number) => number }} params
 * @returns {import('svelte/transition').TransitionConfig}
 */
export function wipeHorizontal(node, { duration = 300, delay = 0, easing = cubicOut } = {}) {
	const targetWidth = node.offsetWidth
	return {
		duration,
		delay,
		easing,
		css: (/** @type {number} */ t) => `
			width: ${t * targetWidth}px;
			overflow: hidden;
			white-space: nowrap;
			opacity: ${t};
		`
	}
}
