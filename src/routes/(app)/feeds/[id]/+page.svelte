<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { getFeed, updateFeed, previewFeed, deleteFeed } from '$remotes/feeds.remote'
	import Switch from '$ui/input/switch.svelte'
	import Button from '$ui/input/button.svelte'
	import CopyField from '$ui/feeds/copy-field.svelte'
	import DeleteFeedDialog from '$ui/feeds/delete-feed-dialog.svelte'
	import { site } from '$lib/site-config'

	type Rule = { type: 'exclude' | 'require'; match: 'title' | 'description' | 'both'; value: string }

	const feedId = page.params.id as string
	const feed = await getFeed(feedId)

	let includeShorts = $state(feed.includeShorts)
	let rules: Rule[] = $state(feed.rules.map((r) => ({ ...r })))
	let savedSnapshot = $state(JSON.stringify({ includeShorts: feed.includeShorts, rules: feed.rules }))
	let saving = $state(false)

	const cleanRules = $derived(rules.filter((r) => r.value.trim().length > 0))
	const dirty = $derived(
		JSON.stringify({ includeShorts, rules: cleanRules }) !== savedSnapshot
	)

	function addRule(type: Rule['type']) {
		rules.push({ type, match: 'title', value: '' })
	}

	function removeRule(index: number) {
		rules.splice(index, 1)
	}

	async function save() {
		saving = true
		try {
			await updateFeed({ feedId, includeShorts, rules: cleanRules })
			savedSnapshot = JSON.stringify({ includeShorts, rules: cleanRules })
			await getFeed(feedId).refresh()
		} finally {
			saving = false
		}
	}

	async function remove() {
		await deleteFeed(feedId)
		await goto(resolve('/(app)/feeds'), { invalidateAll: true })
	}
</script>

<svelte:head>
	<title>{feed.title} — {site.name}</title>
</svelte:head>

<div class="flex items-start justify-between gap-4">
	<div>
		<a href={resolve('/(app)/feeds')} class="text-sm text-neutral-500 hover:text-neutral-800"
			>← Your feeds</a
		>
		<h1 class="mt-1 text-2xl font-semibold tracking-tight-md">{feed.title}</h1>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- external YouTube link -->
		<a
			href={feed.channel.url}
			target="_blank"
			rel="noreferrer"
			class="text-sm text-neutral-500 hover:text-neutral-800"
		>
			{feed.channel.title} on YouTube ↗
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
	<DeleteFeedDialog feedTitle={feed.title} onConfirm={remove} />
</div>

<section class="mt-8">
	<CopyField value={feed.feedUrl} label="Feed URL — add this to your RSS reader" />
</section>

<section class="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
	<Switch
		bind:checked={includeShorts}
		id="include-shorts"
		label="Include YouTube Shorts"
		description="Off by default — Shorts are left out of your feed"
	/>
</section>

<section class="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
	<div class="flex items-center justify-between">
		<h2 class="font-medium">Keyword filters</h2>
		<div class="flex gap-2">
			<Button style="ghost" onclick={() => addRule('exclude')}>+ Exclude</Button>
			<Button style="ghost" onclick={() => addRule('require')}>+ Require</Button>
		</div>
	</div>

	{#if rules.length === 0}
		<p class="mt-3 text-sm text-neutral-500">
			No filters. Exclude drops videos matching a keyword; require keeps only videos matching
			at least one require keyword.
		</p>
	{:else}
		<ul class="mt-4 flex flex-col gap-2">
			{#each rules as rule, index (index)}
				<li class="flex items-center gap-2">
					<select
						bind:value={rule.type}
						class="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm"
					>
						<option value="exclude">Exclude</option>
						<option value="require">Require</option>
					</select>
					<input
						type="text"
						placeholder="keyword or phrase"
						bind:value={rule.value}
						class="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
					/>
					<span class="text-sm text-neutral-400">in</span>
					<select
						bind:value={rule.match}
						class="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm"
					>
						<option value="title">Title</option>
						<option value="description">Description</option>
						<option value="both">Both</option>
					</select>
					<button
						onclick={() => removeRule(index)}
						aria-label="Remove rule"
						class="rounded-full px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-rose-600"
					>
						✕
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if dirty}
	<div
		class="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-3 shadow-card"
	>
		<p class="text-sm text-neutral-600">
			Unsaved changes — applies to <span class="font-medium">new videos only</span>, existing
			items stay put
		</p>
		<Button style="primary" onclick={save} disabled={saving}>
			{saving ? 'Saving…' : 'Save changes'}
		</Button>
	</div>
{/if}

<section class="mt-10">
	<h2 class="font-medium">
		Preview
		{#if dirty}<span class="ml-2 text-sm font-normal text-amber-600">showing unsaved changes</span
			>{/if}
	</h2>
	<p class="mt-1 text-sm text-neutral-500">
		How recent videos evaluate under the settings above. Dimmed videos are excluded.
	</p>

	<svelte:boundary>
		{@const preview = await previewFeed({ feedId, includeShorts, rules: cleanRules })}
		{#if preview.length === 0}
			<p class="mt-6 text-sm text-neutral-500">No videos stored for this channel yet.</p>
		{:else}
			<ul class="mt-4 flex flex-col gap-2">
				{#each preview as item (item.ytVideoId)}
					<li
						class="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-3 {item.included
							? ''
							: 'opacity-45'}"
					>
						{#if item.thumbnailUrl}
							<img
								src={item.thumbnailUrl}
								alt=""
								loading="lazy"
								class="h-[54px] w-[96px] shrink-0 rounded-lg object-cover"
							/>
						{/if}
						<div class="min-w-0 flex-1">
							<!-- eslint-disable svelte/no-navigation-without-resolve -- external YouTube link -->
							<a
								href={item.videoUrl}
								target="_blank"
								rel="noreferrer"
								class="line-clamp-1 font-medium hover:underline"
							>
								{item.title}
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
							<p class="mt-0.5 text-sm text-neutral-500">
								{item.publishedAt.toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
								{#if item.isShort}· Short{/if}
								{#if !item.included}· <span class="text-rose-500">{item.reason}</span>{/if}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#snippet pending()}
			<p class="mt-6 text-sm text-neutral-400">Loading preview…</p>
		{/snippet}
	</svelte:boundary>
</section>
