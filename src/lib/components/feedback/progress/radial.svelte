<script lang="ts">
	import { Tween } from 'svelte/motion'
	import { cubicOut } from 'svelte/easing'

	type Props = {
		value: number
		size?: string
		backgroundColor?: string
		primaryColor?: string
		tween?: boolean
		dur?: number
		onComplete?: () => void
	}
	let {
		value = 0,
		size = '0.8rem',
		backgroundColor = 'var(--color-neutral-200)',
		primaryColor = 'var(--color-neutral-700)',
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
</script>

<div
	class="pie grid place-items-center rounded-full"
	style:width={size}
	style:height={size}
	style:--bg={backgroundColor}
	style:--fill={primaryColor}
	style:--progress={displayValue}
></div>

<style>
	.pie {
		background: conic-gradient(var(--fill) calc(var(--progress, 0) * 1%), var(--bg) 0);
	}
</style>
