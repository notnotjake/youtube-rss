<script lang="ts">
	import type { Snippet } from 'svelte'
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { authClient } from '$lib/auth-client'
	import { site } from '$lib/site-config'
	import { IconDots, IconSettings, IconQuestionMark, IconLogout } from '@tabler/icons-svelte'
    import { createClass } from '@opensky/style';


	let { children }: { children: Snippet } = $props()

	async function logout() {
		await authClient.signOut()
		await goto(resolve('/'), { invalidateAll: true })
	}

	let moreButtonOpen = $state(false)
</script>

<div class="mx-auto min-h-screen max-w-2xl px-6">
	<header class="flex items-center justify-between py-6">
		<a href={resolve('/(app)/feeds')} class="font-semibold tracking-tight-md">{site.name}</a>

		<div class={createClass('h-6 px-2 rounded-full bg-neutral-200 flex items-center', moreButtonOpen && 'h-9')}>
			{#if moreButtonOpen}
				<div class="flex h-7 items-center">
					<button class="px-2">
						<IconSettings class="text-neutral-700" size={20} />
					</button>

					<div class="w-[2.5px] h-5 rounded-full bg-neutral-400/60"></div>

					<button class="px-1">
						<IconQuestionMark class="text-neutral-700" size={20} />
					</button>

					<div class="w-[2.5px] h-5 rounded-full bg-neutral-400/60"></div>

					<button class="px-2" onclick={logout}>
						<IconLogout class="text-neutral-700" size={20} />
					</button>
				</div>
			{:else}
				<button class="group" onclick={() => moreButtonOpen = true}>
					<IconDots class="text-neutral-500 group-hover:text-neutral-700" />
				</button>
			{/if}
		</div>
	</header>
	<main class="pb-24">
		{@render children()}
	</main>
</div>
