<script lang="ts">
	import { createClass } from '@opensky/style'

	type Props = {
		class?: string
		backgroundColor?: string
		shimmerColor?: string
		speed?: 'slow' | 'normal' | 'fast' | number
	}
	let {
		class: classProp,
		backgroundColor = 'var(--color-gray-200)',
		shimmerColor = 'var(--color-slate-100)',
		speed = 'normal'
	}: Props = $props()

	let pulseDuration = $derived.by(() => {
		if (typeof speed === 'number') {
			return `${speed * 1.5}s`
		}
		switch (speed) {
			case 'fast':
				return '2s'
			case 'normal':
				return '3s'
			case 'slow':
				return '4s'
			default:
				return '3s'
		}
	})

	let shimmerDuration = $derived.by(() => {
		if (typeof speed === 'number') {
			return `${speed}s`
		}
		switch (speed) {
			case 'fast':
				return '1s'
			case 'normal':
				return '1.5s'
			case 'slow':
				return '2s'
			default:
				return '1.5s'
		}
	})
</script>

<div class="skeleton-pulse opacity-100" style:--pulse-duration={pulseDuration}>
	<div
		style:--background-color={backgroundColor}
		style:--shimmer-color={shimmerColor}
		style:--shimmer-duration={shimmerDuration}
		class={createClass(
			'skeleton relative flex h-6 min-w-14 items-center justify-center overflow-hidden rounded-full px-3 py-1 shadow-inner-xs before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:to-transparent',
			classProp
		)}
	></div>
</div>

<style>
	.skeleton-pulse {
		animation: pulse var(--pulse-duration) cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
	.skeleton {
		background-color: var(--background-color);
	}
	.skeleton::before {
		background-image: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--shimmer-color) 80%, transparent),
			transparent
		);
		animation: shimmer var(--shimmer-duration) infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	@keyframes shimmer {
		to {
			transform: translateX(200%);
		}
	}
</style>
