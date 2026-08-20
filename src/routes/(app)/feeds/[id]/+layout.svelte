<script lang="ts">
	import type { Snippet } from 'svelte'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import AccountControls from '#ui/auth/account-controls.svelte'
	import { site } from '#lib/site-config.ts'

	let { children }: { children: Snippet } = $props()
</script>

<div class="mx-auto max-w-2xl px-6 pt-3 pb-24 lg:pt-4">
	<div class="flex h-8 items-center justify-between gap-4">
		<a
			href={resolve('/(app)/feeds')}
			class="relative inline-flex h-8 items-center rounded-sm font-semibold tracking-tight-md outline-none after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-4"
		>
			{site.name}
		</a>
		<AccountControls email={page.data.user.email} />
	</div>
	<div class="mt-8">
		{@render children()}
	</div>
</div>
