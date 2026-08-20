<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { authClient } from '#lib/auth-client.ts'

	let { email }: { email: string } = $props()
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

<div class="relative flex h-8 min-w-0 items-center gap-3 text-sm text-neutral-500">
	<span class="max-w-64 truncate" title={email}>{email}</span>
	<button
		onclick={logout}
		disabled={loggingOut}
		aria-busy={loggingOut}
		class="relative shrink-0 rounded-sm px-1 py-1 outline-none after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] disabled:cursor-wait disabled:text-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
	>
		Log out
	</button>
	{#if logoutError}
		<p
			role="alert"
			class="absolute top-full right-0 z-10 mt-2 w-max max-w-64 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700 shadow-card"
		>
			{logoutError}
		</p>
	{/if}
</div>
