<script lang="ts">
	import type { Snippet } from 'svelte'
	import { createClass } from '@opensky/style'
	import { Tween } from 'svelte/motion'
	import { cubicOut } from 'svelte/easing'

	type Props = {
		children: Snippet
		class?: string
		backgroundColor?: string
		primaryColor?: string
		value: number
		min?: number
		max?: number
		direction?: 'up' | 'down' | 'left' | 'right'
		dur?: number
		onComplete?: () => void
	}
	let {
		children,
		class: classProp,
		backgroundColor = 'var(--color-neutral-300)',
		primaryColor = 'var(--color-neutral-700)',
		value = 0,
		min = 0,
		max = 100,
		direction = 'up',
		dur = 500,
		onComplete
	}: Props = $props()

	// Create a tweened store for smooth transitions
	const progress = new Tween(0, { easing: cubicOut })

	// Update the progress when percentComplete changes
	$effect(() => {
		const target = value >= 100 ? 100 : Math.min(max, Math.max(min, value))
		progress.set(target, { duration: dur })
	})

	$effect(() => {
		if (progress.current >= 100 && onComplete) {
			onComplete()
		}
	})

	let gradientPosition = $derived(100 - progress.current)

	let gradientDirection = $derived.by(() => {
		if (direction === 'up') return 'to bottom'
		else if (direction === 'down') return 'to top'
		else if (direction === 'left') return 'to right'
		else if (direction === 'right') return 'to left'
		else return 'to bottom'
	})
</script>

<div
	class={createClass('progress-text', classProp)}
	style:--background-color={backgroundColor}
	style:--primary-color={primaryColor}
	style:--gradient-dir={gradientDirection}
	style:--gradient-position={gradientPosition + '%'}
>
	{@render children?.()}
</div>

<style>
	.progress-text {
		display: inline-block;
		position: relative;
		background: linear-gradient(
			var(--gradient-dir),
			var(--background-color) var(--gradient-position),
			var(--primary-color) var(--gradient-position),
			var(--primary-color) 100%
		);
		color: transparent;
		background-clip: text;
		-webkit-background-clip: text;
	}
</style>
