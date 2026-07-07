<script lang="ts">
	import type { Snippet } from 'svelte'

	type Props = {
		children: Snippet
		onclick?: (e: MouseEvent) => void
		href?: string
		type?: 'button' | 'submit'
		disabled?: boolean
		style?: 'primary' | 'secondary' | 'ghost' | 'destructive'
		class?: string
	}

	let {
		children,
		onclick,
		href,
		type = 'button',
		disabled = false,
		style = 'secondary',
		class: classProp = ''
	}: Props = $props()

	const styles = {
		primary: 'bg-neutral-800 text-white hover:bg-neutral-900',
		secondary: 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300',
		ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-200',
		destructive: 'bg-transparent text-rose-600 hover:bg-rose-50'
	}

	const classes = $derived(
		`inline-flex items-center justify-center rounded-full px-4 py-1.5 font-medium transition-colors duration-100 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${styles[style]} ${classProp}`
	)
</script>

{#if href}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass already-resolved paths -->
	<a {href} class={classes}>{@render children()}</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button {type} {disabled} {onclick} class={classes}>{@render children()}</button>
{/if}
