<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { getFeeds, addFeed } from '$remotes/feeds.remote'
	import Button from '$ui/input/button.svelte'
	import { site } from '$lib/site-config'

	let url = $state('')
	let adding = $state(false)
	let errorMessage: string | null = $state(null)

	async function add(event: SubmitEvent) {
		event.preventDefault()
		if (!url.trim()) return
		adding = true
		errorMessage = null

		try {
			const { feedId } = await addFeed(url)
			url = ''
			await goto(resolve('/(app)/feeds/[id]', { id: feedId }))
		} catch (e) {
			const err = e as { body?: { message?: string } }
			errorMessage = err.body?.message ?? 'Could not add that channel'
		} finally {
			adding = false
		}
	}
</script>

<svelte:head>
	<title>Your feeds — {site.name}</title>
</svelte:head>

<h1 class="text-2xl font-semibold tracking-tight-md">Your feeds</h1>

<form onsubmit={add} class="mt-6 flex gap-2">
	<input
		type="text"
		placeholder="Paste a YouTube link — channel, @handle, or any video"
		bind:value={url}
		class="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 outline-none focus:border-neutral-500"
	/>
	<Button type="submit" style="primary" disabled={adding || !url.trim()}>
		{adding ? 'Adding…' : 'Add feed'}
	</Button>
</form>
{#if errorMessage}
	<p class="mt-3 text-sm text-rose-600">{errorMessage}</p>
{/if}

<svelte:boundary>
	{@const feeds = await getFeeds()}
	{#if feeds.length === 0}
		<p class="mt-12 text-center text-neutral-500">
			No feeds yet — paste a YouTube link above to create your first one.
		</p>
	{:else}
		<ul class="mt-8 flex flex-col gap-3">
			{#each feeds as feed (feed.id)}
				<li>
					<a
						href={resolve('/(app)/feeds/[id]', { id: feed.id })}
						class="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-card transition-colors hover:border-neutral-300"
					>
						<div class="min-w-0">
							<h2 class="truncate font-medium">{feed.title}</h2>
							<p class="mt-0.5 text-sm text-neutral-500">
								{feed.itemCount}
								{feed.itemCount === 1 ? 'video' : 'videos'}
								{#if feed.includeShorts}· Shorts on{/if}
								{#if feed.ruleCount > 0}
									· {feed.ruleCount}
									{feed.ruleCount === 1 ? 'filter' : 'filters'}
								{/if}
							</p>
						</div>
						<span class="shrink-0 text-sm text-neutral-400">Manage →</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	{#snippet pending()}
		<p class="mt-12 text-center text-neutral-400">Loading feeds…</p>
	{/snippet}
</svelte:boundary>
