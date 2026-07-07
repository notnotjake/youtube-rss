<script lang="ts">
	import type { Snippet } from 'svelte'
	import { createClass, preserveClass } from '@opensky/style'

	type Props = {
		children: Snippet
		class?: string
		speed?: 'slow' | 'normal' | 'fast' | number
		spread?: number
		backgroundColor?: string
		primaryColor?: string
	}
	let {
		children,
		class: classProp,
		speed = 'normal',
		spread = 6,
		backgroundColor = 'var(--color-neutral-500)',
		primaryColor = 'var(--color-neutral-900)'
	}: Props = $props()

	let element = $state<null | HTMLElement>(null)

	let textLength = $derived(element?.innerText?.length ?? 1)

	let speedMultiplier = $derived.by(() => {
		if (typeof speed === 'number') {
			return speed
		}
		switch (speed) {
			case 'fast':
				return 0.09
			case 'normal':
				return 0.15
			case 'slow':
				return 0.2
			default:
				return 0.15
		}
	})
</script>

<div class="animate-fade-in-scale">
	<p
		bind:this={element}
		style:--duration={`calc(${textLength} * ${speedMultiplier}s)`}
		style:--spread={`calc(${spread} * 0.5ch)`}
		style:--background-color={backgroundColor}
		style:--primary-color={primaryColor}
		class={createClass(
			'relative inline-block whitespace-nowrap text-transparent',
			preserveClass('text-shimmer'),
			classProp
		)}
	>
		{@render children()}
	</p>
</div>

<style>
	.text-shimmer {
		background:
			linear-gradient(
					100deg,
					#0000 calc(50% - var(--spread)),
					var(--primary-color) 50%,
					#0000 calc(50% + var(--spread))
				)
				0 0 / 250% 100% no-repeat border-box,
			linear-gradient(var(--background-color), var(--background-color)) padding-box;
		color: transparent;
		background-clip: text;
		animation: shimmer var(--duration) infinite both ease-out;
	}
	@keyframes shimmer {
		0% {
			background-position: 100% center;
		}
		100% {
			background-position: -30% center;
		}
	}
</style>
