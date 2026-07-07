<script lang="ts">
	import { createClass } from '@opensky/style'

	type Props = {
		class?: string
		spread?: number
		backgroundColor?: string
		primaryColor?: string
		bounce?: boolean
		speed?: 'slow' | 'normal' | 'fast' | number
	}
	let {
		class: classProp,
		spread = 80,
		backgroundColor = 'var(--color-sky-100)',
		primaryColor = 'var(--color-sky-500)',
		bounce = false,
		speed = 'normal'
	}: Props = $props()

	let duration = $derived.by(() => {
		if (typeof speed === 'number') {
			return `${speed}s`
		}
		switch (speed) {
			case 'fast':
				return '1s'
			case 'normal':
				return '1.75s'
			case 'slow':
				return '2.75s'
			default:
				return '2s'
		}
	})
</script>

<div
	style:background={backgroundColor}
	class={createClass('relative h-2 w-20 overflow-hidden rounded-full', classProp)}
>
	<div
		style:--primary-color={primaryColor}
		style:--duration={duration}
		style:width={`${spread}%`}
		class={bounce ? 'suspense-bar-bounce suspense-bar-fill' : 'suspense-bar suspense-bar-fill'}
		class:absolute={true}
		class:top-0={true}
		class:h-full={true}
	></div>
</div>

<style>
	.suspense-bar {
		left: -100%;
		animation-name: suspense-bar;
		animation-duration: var(--duration);
		animation-iteration-count: infinite;
		animation-fill-mode: both;
		animation-timing-function: linear;
	}
	.suspense-bar-bounce {
		left: -100%;
		animation-name: suspense-bar-bounce;
		animation-duration: var(--duration);
		animation-iteration-count: infinite;
		animation-fill-mode: both;
		animation-timing-function: linear;
	}
	@keyframes suspense-bar {
		100% {
			transform: translateX(250%);
		}
	}
	@keyframes suspense-bar-bounce {
		0% {
			transform: translateX(25%);
		}
		50% {
			transform: translateX(250%);
		}
		100% {
			transform: translateX(25%);
		}
	}
	.suspense-bar-fill {
		background: linear-gradient(to right, transparent, var(--primary-color), transparent);
	}
</style>
