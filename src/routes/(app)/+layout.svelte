<script lang="ts">
	import type { Snippet } from 'svelte'
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { authClient } from '$lib/auth-client'
	import { site } from '$lib/site-config'
	import { IconLogout } from '@tabler/icons-svelte'

	let { children }: { children: Snippet } = $props()
	let loggingOut = $state(false)
	let logoutError = $state<string | null>(null)

	async function logout() {
		if (loggingOut) return
		loggingOut = true
		logoutError = null

		try {
			const { error } = await authClient.signOut()
			if (error) {
				logoutError = 'Couldn’t log out. Try again.'
				return
			}

			await goto(resolve('/'), { invalidateAll: true })
		} catch {
			logoutError = 'Couldn’t log out. Try again.'
		} finally {
			loggingOut = false
		}
	}
</script>

<div class="mx-auto min-h-screen max-w-2xl px-6">
	<header class="flex items-center justify-between py-4">
		<a
			href={resolve('/(app)/feeds')}
			class="inline-flex min-h-11 touch-manipulation items-center rounded-md font-semibold tracking-tight-md outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
		>
			{site.name}
		</a>

		<div class="relative">
			<button
				type="button"
				onclick={logout}
				disabled={loggingOut}
				aria-busy={loggingOut}
				aria-describedby={logoutError ? 'logout-error' : undefined}
				class="inline-flex min-h-11 w-34 touch-manipulation items-center justify-center gap-2 rounded-full bg-neutral-200 px-4 text-sm font-medium text-neutral-700 outline-none transition-[background-color,color,transform] duration-150 hover:bg-neutral-300 hover:text-neutral-900 active:scale-[0.97] disabled:cursor-wait disabled:text-neutral-500 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
			>
				<IconLogout aria-hidden="true" size={20} />
				<span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
			</button>

			{#if logoutError}
				<p
					id="logout-error"
					role="alert"
					class="absolute top-full right-0 z-10 mt-2 w-max max-w-64 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700 shadow-card"
				>
					{logoutError}
				</p>
			{/if}
		</div>
	</header>
	<main class="pb-24">
		{@render children()}
	</main>
</div>
