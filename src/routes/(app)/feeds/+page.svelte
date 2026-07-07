<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { IconPlus, IconRss, IconCopy, IconCheck, IconDots } from '@tabler/icons-svelte'
	import { getFeeds, addFeed } from '$remotes/feeds.remote'
	import { site } from '$lib/site-config'

	// No boundary/pending around this — navigation waits for the data instead
	// of flashing a loading state (the +page.ts load warms it during nav)
	const feeds = $derived(await getFeeds())

	let url = $state('')
	let adding = $state(false)
	let errorMessage: string | null = $state(null)
	let copiedFeedId: string | null = $state(null)

	async function copyFeedUrl(feed: { id: string; feedUrl: string }) {
		await navigator.clipboard.writeText(feed.feedUrl)
		copiedFeedId = feed.id
		setTimeout(() => {
			if (copiedFeedId === feed.id) copiedFeedId = null
		}, 1500)
	}

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

<form onsubmit={add} class="relative mt-6">
	<input
		type="text"
		placeholder="Paste a YouTube link — channel, @handle, or any video"
		bind:value={url}
		class="w-full rounded-full border border-neutral-300 bg-white py-3 pr-26 pl-5 outline-none focus:border-neutral-500"
	/>
	<button
		type="submit"
		disabled={adding || !url.trim()}
		class="absolute top-1/2 right-1.5 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-neutral-800 py-2 pr-4 pl-3 font-medium text-white transition-all hover:bg-neutral-900 active:scale-[0.97] disabled:opacity-50"
	>
		<IconPlus size={18} stroke={2.5} />
		{adding ? 'Adding…' : 'Add'}
	</button>
</form>
{#if errorMessage}
	<p class="mt-3 text-sm text-rose-600">{errorMessage}</p>
{/if}

{#if feeds.length === 0}
		<p class="mt-12 text-center text-neutral-500">
			No feeds yet — paste a YouTube link above to create your first one.
		</p>
	{:else}
		<ul class="mt-8 flex flex-col gap-3">
			{#each feeds as feed (feed.id)}
				<li
					class="relative flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-card transition-colors hover:border-neutral-300"
				>
					<!-- Stretched link: the whole row navigates, buttons sit above it -->
					<a
						href={resolve('/(app)/feeds/[id]', { id: feed.id })}
						class="absolute inset-0 rounded-2xl"
						aria-label="Manage {feed.title}"
					></a>
					{#if feed.channelIcon}
						<img
							src={feed.channelIcon}
							alt=""
							loading="lazy"
							referrerpolicy="no-referrer"
							class="size-11 shrink-0 rounded-full object-cover"
						/>
					{:else}
						<div
							class="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"
						>
							<IconRss size={20} />
						</div>
					{/if}
					<div class="min-w-0 flex-1">
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
					<div class="relative z-10 flex shrink-0 items-center gap-1.5">
						<button
							onclick={() => copyFeedUrl(feed)}
							aria-label="Copy feed URL"
							title="Copy feed URL"
							class="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-all hover:bg-neutral-200 hover:text-neutral-800 active:scale-[0.94]"
						>
							{#if copiedFeedId === feed.id}
								<IconCheck size={18} class="text-green-600" />
							{:else}
								<IconCopy size={18} />
							{/if}
						</button>
						<a
							href={resolve('/(app)/feeds/[id]', { id: feed.id })}
							aria-label="Manage {feed.title}"
							title="Manage feed"
							class="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-all hover:bg-neutral-200 hover:text-neutral-800 active:scale-[0.94]"
						>
							<IconDots size={18} />
						</a>
					</div>
				</li>
			{/each}
		</ul>
{/if}
