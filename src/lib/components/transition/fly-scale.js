import { cubicOut } from 'svelte/easing'

/**
 * @param {string | number} value
 * @returns {[number, string]}
 */
function split_css_unit(value) {
	const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/)
	if (split) {
		return [parseFloat(split[1]), split[2] || 'px']
	}
	if (typeof value === 'number') {
		return [value, 'px']
	}
	throw new Error(`Cannot parse CSS unit from: ${value}`)
}

/**
 * Animates the x and y positions, scale, and the opacity of an element. `in` transitions animate from the provided values, passed as parameters to the element's default values. `out` transitions animate from the element's default values to the provided values.
 * @param {Element} node - The DOM element to apply the transition to
 * @param {Object} [params] - Transition parameters
 * @param {number} [params.delay=0] - Delay in milliseconds before the transition starts
 * @param {number} [params.duration=400] - Duration of the transition in milliseconds
 * @param {function} [params.easing=cubicOut] - Easing function to use for the transition
 * @param {number|string} [params.x=0] - Distance to fly along the x-axis (e.g., '100px', '10rem', -20)
 * @param {number|string} [params.y=0] - Distance to fly along the y-axis (e.g., '100px', '10rem', -20)
 * @param {number} [params.scale=0] - Starting scale factor (0 = invisible, 0.5 = half-size, 1 = full-size)
 * @param {number} [params.opacity=0] - Starting opacity (0 = transparent, 1 = fully opaque)
 */
export function flyScale(
	node,
	{ delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, scale = 0, opacity = 0 } = {}
) {
	const style = getComputedStyle(node)
	const target_opacity = +style.opacity
	const transform = style.transform === 'none' ? '' : style.transform

	// Scale calculations (from scale transition)
	const sd = 1 - scale

	// Opacity calculations (common to both transitions)
	const od = target_opacity * (1 - opacity)

	// Position calculations (from fly transition)
	const [x_value, x_unit] = split_css_unit(x)
	const [y_value, y_unit] = split_css_unit(y)

	return {
		delay,
		duration,
		easing,
		css: (/** @type {number} */ t, /** @type {number} */ u) => `
	  transform: ${transform}
				translate(${(1 - t) * x_value}${x_unit}, ${(1 - t) * y_value}${y_unit})
				scale(${1 - sd * u});
	  opacity: ${target_opacity - od * u}
	`
	}
}
