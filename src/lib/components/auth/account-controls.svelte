<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { authClient } from '$lib/auth-client'

	let { email }: { email: string } = $props()

	async function logout() {
		await authClient.signOut()
		await goto(resolve('/'), { invalidateAll: true })
	}
</script>

<div class="flex h-8 min-w-0 items-center gap-3 text-sm text-neutral-500">
	<span class="max-w-64 truncate" title={email}>{email}</span>
	<button
		onclick={logout}
		class="relative shrink-0 rounded-sm px-1 py-1 outline-none after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
	>
		Log out
	</button>
</div>
