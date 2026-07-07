<script lang="ts">
	import { resolve } from '$app/paths'
	import { site } from '$lib/site-config'
</script>

<svelte:head>
	<title>{site.name}</title>
	<meta name="description" content={site.description} />
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
	<h1 class="text-3xl font-semibold tracking-tight-lg">{site.name}</h1>
	<p class="mt-3 text-lg text-neutral-600">{site.description}</p>
	<div class="mt-8">
		<a
			href={resolve('/(app)/feeds')}
			class="inline-flex items-center rounded-full bg-neutral-800 px-5 py-2 font-medium text-white transition-colors hover:bg-neutral-900"
		>
			Manage your feeds
		</a>
	</div>
</main>
