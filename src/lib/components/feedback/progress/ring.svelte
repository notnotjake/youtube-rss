<script lang="ts">
	import { Tween } from 'svelte/motion'
	import { cubicOut } from 'svelte/easing'

	type Props = {
		size?: number
		thickness?: number
		value?: number
		backgroundColor?: string | false
		primaryColor?: string
		gradient?: boolean
		tween?: boolean
		dur?: number
		onComplete?: () => void
	}
	let {
		size = 22,
		thickness = 8,
		value = 42,
		backgroundColor = false,
		primaryColor = 'var(--color-sky-500)',
		gradient = false,
		tween = true,
		dur = 500,
		onComplete
	}: Props = $props()

	// Create a tweened store for smooth transitions
	const progress = new Tween(0, { easing: cubicOut })

	// Update the progress when value changes
	$effect(() => {
		progress.set(Math.min(100, Math.max(0, value)), { duration: tween ? dur : 0 })
	})

	$effect(() => {
		if (progress.current >= 100 && onComplete) {
			onComplete()
		}
	})

	let displayValue = $derived(progress.current)

	let arcPath = $derived.by(() => {
		// Constrain percentage between 0 and 100
		const p = Math.min(99.9, Math.max(0, displayValue))

		// Convert percentage to radians (starting from -90° to start at 12 o'clock)
		const startAngle = -Math.PI / 2
		const endAngle = startAngle + (2 * Math.PI * p) / 100

		// Center point
		const cx = 20
		const cy = 20
		const r = 20 - thickness / 2

		// Calculate start and end points
		const startX = cx + r * Math.cos(startAngle)
		const startY = cy + r * Math.sin(startAngle)
		const endX = cx + r * Math.cos(endAngle)
		const endY = cy + r * Math.sin(endAngle)

		// Determine if we need to use the large arc flag
		const largeArcFlag = p > 50 ? 1 : 0

		// Create the SVG arc path
		return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY}`
	})
</script>

<div class="inline-block" style="width: {size}px; height: {size}px;">
	<svg viewBox="0 0 40 40">
		<defs>
			<linearGradient id="gradient" gradientUnits="userSpaceOnUse" gradientTransform="rotate(120)">
				<stop offset="0%" stop-color={primaryColor} stop-opacity="0.7" />
				<stop offset="60%" stop-color={primaryColor} stop-opacity="0.95" />
				<stop offset="100%" stop-color={primaryColor} stop-opacity="1" />
			</linearGradient>
		</defs>
		{#if backgroundColor}
			<circle
				cx="20"
				cy="20"
				r={20 - thickness / 2}
				fill="none"
				stroke={backgroundColor}
				stroke-width={thickness}
			/>
		{/if}
		<path
			d={arcPath}
			fill="none"
			stroke={gradient ? 'url(#gradient' : primaryColor}
			stroke-width={thickness}
			stroke-linecap="round"
		/>
	</svg>
</div>
