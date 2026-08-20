<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import {
		IconCheck,
		IconCopy,
		IconExternalLink,
		IconPlayerPlay,
		IconPlus,
		IconRss,
		IconSettings
	} from '@tabler/icons-svelte'
	import { addFeed, getFeeds, getMaterializedFeed } from '#remotes/feeds.remote.ts'
	import AccountControls from '#ui/auth/account-controls.svelte'
	import { site } from '#lib/site-config.ts'

	const feeds = $derived(await getFeeds())

	let url = $state('')
	let adding = $state(false)
	let errorMessage: string | null = $state(null)
	let copiedFeedId: string | null = $state(null)
	let selectedFeedId = $state('all')
	const materializedItems = $derived(
		await getMaterializedFeed(selectedFeedId === 'all' ? null : selectedFeedId)
	)

	const visibleFeedItems = $derived(materializedItems)

	function formatPublishedAt(date: Date) {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
		})
	}

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
	<title>Your subscriptions — {site.name}</title>
</svelte:head>

<div
	class="min-h-screen bg-white lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden"
>
	<section
		aria-labelledby="subscriptions-heading"
		class="bg-white lg:overflow-y-auto lg:overscroll-contain"
	>
		<div class="ml-auto max-w-[800px] px-5 pt-3 pb-8 sm:px-8 lg:px-10 lg:pt-4 xl:pr-12">
			<a
				href={resolve('/(app)/feeds')}
				class="relative inline-flex h-8 items-center rounded-sm font-semibold tracking-tight-md outline-none after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-4"
			>
				{site.name}
			</a>

			<h1 id="subscriptions-heading" class="mt-8 text-2xl font-semibold tracking-tight-md">
				Subscriptions
			</h1>

			<form onsubmit={add} class="relative mt-6">
				<label for="youtube-url" class="sr-only">Add a YouTube channel or video</label>
				<input
					id="youtube-url"
					type="text"
					placeholder="Paste a channel, @handle, or video link"
					bind:value={url}
					aria-describedby={errorMessage ? 'add-feed-error' : undefined}
					aria-invalid={errorMessage ? 'true' : undefined}
					class="min-h-12 w-full rounded-full border border-black/12 bg-white py-3 pr-27 pl-5 text-[16px] outline-none transition-[border-color,box-shadow] focus:border-neutral-500 focus:ring-3 focus:ring-neutral-900/8"
				/>
				<button
					type="submit"
					disabled={adding || !url.trim()}
					class="primary-action absolute inset-y-0.5 right-0.5 inline-flex items-center gap-1.5 rounded-full bg-neutral-800 pr-4 pl-3.5 font-medium text-white outline-none transition-[background-color,transform] active:scale-[0.97] disabled:pointer-events-none disabled:bg-neutral-300 disabled:text-neutral-500 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
				>
					<IconPlus size={18} stroke={2.5} />
					{adding ? 'Adding…' : 'Add'}
				</button>
			</form>

			{#if errorMessage}
				<p id="add-feed-error" role="alert" class="mt-3 text-sm text-rose-600">
					{errorMessage}
				</p>
			{/if}

			{#if feeds.length === 0}
				<div class="mt-12 rounded-2xl border border-dashed border-black/12 px-6 py-10 text-center">
					<div
						class="mx-auto flex size-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"
					>
						<IconRss size={20} />
					</div>
					<h2 class="mt-4 font-medium">Build your first subscription</h2>
					<p class="mx-auto mt-1 max-w-sm text-sm leading-6 text-neutral-500">
						Paste any YouTube link above. Shorts are hidden by default, and you can add keyword
						filters next.
					</p>
				</div>
			{:else}
				<ul class="mt-8 flex flex-col gap-3">
					{#each feeds as feed (feed.id)}
						<li
							class="subscription-card flex items-center gap-4 rounded-2xl border border-black/8 bg-white px-4 py-3.5 shadow-card transition-[border-color,box-shadow]"
						>
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
								<a
									href={resolve('/(app)/feeds/[id]', { id: feed.id })}
									class="subscription-title block truncate rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
								>
									{feed.title}
								</a>
								<p class="mt-0.5 truncate text-sm text-neutral-500">
									{feed.itemCount} {feed.itemCount === 1 ? 'video' : 'videos'}
									<span class="px-1" aria-hidden="true">·</span>{feed.includeShorts
										? 'Shorts on'
										: 'Shorts off'}
									{#if feed.ruleCount > 0}
										<span class="px-1" aria-hidden="true">·</span>{feed.ruleCount}
										{feed.ruleCount === 1 ? 'filter' : 'filters'}
									{/if}
								</p>
							</div>
							<div class="flex shrink-0 items-center gap-1">
								<button
									onclick={() => copyFeedUrl(feed)}
									aria-label={copiedFeedId === feed.id ? 'Feed URL copied' : 'Copy feed URL'}
									title={copiedFeedId === feed.id ? 'Copied' : 'Copy feed URL'}
									class="icon-action flex size-11 items-center justify-center rounded-full text-neutral-500 outline-none transition-[background-color,color,transform] active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
								>
									{#if copiedFeedId === feed.id}
										<IconCheck size={18} class="text-emerald-600" />
									{:else}
										<IconCopy size={18} />
									{/if}
								</button>
								<a
									href={resolve('/(app)/feeds/[id]', { id: feed.id })}
									aria-label="Manage {feed.title}"
									title="Subscription settings"
									class="icon-action flex size-11 items-center justify-center rounded-full text-neutral-500 outline-none transition-[background-color,color,transform] active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
								>
									<IconSettings size={18} />
								</a>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<section
		aria-labelledby="feed-heading"
		class="bg-[#FAFAFA] lg:overflow-y-auto lg:overscroll-contain"
	>
		<div class="mr-auto max-w-[800px] px-5 pt-3 pb-8 sm:px-8 lg:px-10 lg:pt-4 xl:pl-12">
			<div class="flex h-8 items-center justify-end">
				<AccountControls email={page.data.user.email} />
			</div>

			<div class="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
				<h2 id="feed-heading" class="text-2xl font-semibold tracking-tight-md">Feed</h2>

				{#if feeds.length > 0}
					<div class="shrink-0">
						<label for="feed-filter" class="sr-only">Filter your feed by subscription</label>
						<select
							id="feed-filter"
							bind:value={selectedFeedId}
							class="min-h-11 max-w-64 cursor-pointer rounded-full border border-black/10 bg-white px-4 pr-9 text-[16px] font-medium outline-none focus:border-neutral-500 focus:ring-3 focus:ring-neutral-900/8"
						>
							<option value="all">All subscriptions</option>
							{#each feeds as feed (feed.id)}
								<option value={feed.id}>{feed.title}</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>

			{#if visibleFeedItems.length === 0}
				<div class="mt-10 rounded-2xl border border-dashed border-black/12 bg-white/60 px-6 py-12 text-center">
					<div
						class="mx-auto flex size-11 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm"
					>
						<IconPlayerPlay size={20} />
					</div>
					<h3 class="mt-4 font-medium">
						{feeds.length === 0 ? 'Your videos will appear here' : 'No matching videos yet'}
					</h3>
					<p class="mx-auto mt-1 max-w-sm text-sm leading-6 text-neutral-500">
						{feeds.length === 0
							? 'Add a YouTube subscription to start building a calm, filtered viewing queue.'
							: 'New videos that pass this subscription’s settings will show up automatically.'}
					</p>
				</div>
			{:else}
				<ul class="mt-8 flex flex-col gap-4">
					{#each visibleFeedItems as item (item.id)}
						<li>
							<a
								href={item.videoUrl}
								target="_blank"
								rel="noreferrer"
								class="feed-card block rounded-2xl border border-black/8 bg-white p-3 shadow-card outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 sm:p-4"
							>
							<div class="flex gap-4">
								<div
									class="video-thumbnail relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-[90px] sm:w-[160px]"
								>
									{#if item.thumbnailUrl}
										<img
											src={item.thumbnailUrl}
											alt=""
											loading="lazy"
											referrerpolicy="no-referrer"
											class="size-full object-cover transition-transform"
										/>
									{:else}
										<span class="flex size-full items-center justify-center text-neutral-400">
											<IconPlayerPlay size={22} />
										</span>
									{/if}
								</div>

								<div class="flex min-w-0 flex-1 flex-col">
									<div class="flex min-w-0 items-center gap-2 text-xs text-neutral-500">
										{#if item.channelIcon}
											<img
												src={item.channelIcon}
												alt=""
												loading="lazy"
												referrerpolicy="no-referrer"
												class="size-5 shrink-0 rounded-full object-cover"
											/>
										{/if}
										<span class="truncate font-medium text-neutral-700">{item.channelTitle}</span>
										<span aria-hidden="true">·</span>
										<time datetime={item.publishedAt.toISOString()} class="shrink-0">
											{formatPublishedAt(item.publishedAt)}
										</time>
									</div>

									<span class="video-title mt-2 line-clamp-2 font-medium leading-5 text-neutral-900">
										{item.title}
									</span>

									<div class="mt-auto flex items-end justify-between gap-2 pt-2">
										{#if item.isShort}
											<p class="text-xs text-neutral-400">Short</p>
										{/if}
										<span
											aria-hidden="true"
											class="external-action -mr-1 -mb-1 ml-auto flex size-11 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-[background-color,color]"
										>
											<IconExternalLink size={17} />
										</span>
									</div>
								</div>
							</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
</div>

<style>
	@media (hover: hover) and (pointer: fine) {
		.primary-action:hover {
			background: var(--color-neutral-900);
		}

		.subscription-card:hover,
		.feed-card:hover {
			border-color: color-mix(in oklch, var(--color-neutral-900) 18%, transparent);
		}

		.subscription-title:hover,
		.feed-card:hover .video-title {
			text-decoration: underline;
			text-underline-offset: 3px;
		}

		.icon-action:hover,
		.feed-card:hover .external-action {
			background: var(--color-neutral-100);
			color: var(--color-neutral-800);
		}

		.feed-card:hover .video-thumbnail img {
			transform: scale(1.025);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.subscription-card,
		.feed-card,
		.icon-action,
		.external-action,
		.video-thumbnail img {
			transition: none;
		}
	}
</style>
