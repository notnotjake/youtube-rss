<script lang="ts">
	import { ProgressCountdown } from '$ui/feedback'
	import { createClass } from '@opensky/style'

	let {
		cooldownMs = 20 * 1000,
		onclick,
		dark = false
	}: {
		cooldownMs: number
		onclick: () => void | Promise<void>
		dark?: boolean
	} = $props()

	let resendAvailable = $state(false) // Controls when button is available

	const onComplete = () => {
		resendAvailable = true
	}
</script>

<button
	{onclick}
	disabled={!resendAvailable}
	class="group flex items-center rounded-full bg-none px-4 py-2 font-medium text-neutral-700 transition-all group-data-dark/reauth:text-neutral-300 hover:bg-neutral-50 group-data-dark/reauth:hover:bg-neutral-800/80 active:scale-95 disabled:text-neutral-500"
>
	<p class="font-medium">Resend</p>
	{#if !resendAvailable}
		<div
			class={createClass(
				'overflow-hidden transition-all duration-250',
				'max-w-0 pl-0 opacity-50 group-hover:max-w-40 group-hover:pl-1 group-hover:opacity-100'
			)}
		>
			<div
				class={createClass(
					'w-fit pl-1 transition-all duration-250',
					'-translate-x-full group-hover:translate-x-0'
				)}
			>
				<ProgressCountdown
					totalTime={cooldownMs / 1000}
					currentTime={3}
					{onComplete}
					backgroundColor={dark ? 'var(--color-neutral-600)' : undefined}
					primaryColor={dark ? 'var(--color-neutral-400)' : undefined}
					class="text-neutral-400"
				/>
			</div>
		</div>
	{/if}
</button>
