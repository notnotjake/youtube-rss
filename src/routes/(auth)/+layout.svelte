<script lang="ts">
	import { resolve } from '$app/paths'
	import { site } from '$lib/site-config'
	let { children } = $props()
</script>

<div
	class="relative flex h-full w-full shrink-0 flex-col items-center justify-center overflow-scroll bg-white"
>
	<a
		class="z-50 mx-auto block pt-2 text-center text-base font-medium tracking-tight-md text-black/55 no-underline transition-all duration-300 hover:text-black/85"
		href={resolve('/')}>{site.name}</a
	>

	{@render children()}

	<div class="mb-6"></div>
</div>
