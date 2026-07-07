<script lang="ts">
	import type { Snippet } from 'svelte'
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { authClient } from '$lib/auth-client'
	import { site } from '$lib/site-config'

	let { children, data }: { children: Snippet; data: { user: { email: string } } } = $props()

	async function logout() {
		await authClient.signOut()
		await goto(resolve('/'), { invalidateAll: true })
	}
</script>

<div class="mx-auto min-h-screen max-w-2xl px-6">
	<header class="flex items-center justify-between py-6">
		<a href={resolve('/(app)/feeds')} class="font-semibold tracking-tight-md">{site.name}</a>
		<div class="flex items-center gap-3 text-sm text-neutral-500">
			<span>{data.user.email}</span>
			<button onclick={logout} class="text-neutral-500 underline hover:text-neutral-800">
				Log out
			</button>
		</div>
	</header>
	<main class="pb-24">
		{@render children()}
	</main>
</div>
