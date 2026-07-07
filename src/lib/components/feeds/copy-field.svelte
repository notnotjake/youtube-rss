<script lang="ts">
	import { IconCopy, IconCheck } from '@tabler/icons-svelte'

	type Props = { value: string; label?: string }
	let { value, label = 'Feed URL' }: Props = $props()

	let copied = $state(false)

	async function copy() {
		await navigator.clipboard.writeText(value)
		copied = true
		setTimeout(() => (copied = false), 1500)
	}
</script>

<div class="flex flex-col gap-1.5">
	<span class="text-sm font-medium text-neutral-600">{label}</span>
	<div class="relative">
		<input
			readonly
			{value}
			onfocus={(e) => e.currentTarget.select()}
			class="w-full rounded-full border border-neutral-200 bg-white py-2.5 pr-28 pl-5 font-mono text-sm text-neutral-700 outline-none focus:border-neutral-400"
		/>
		<button
			onclick={copy}
			class="absolute top-1/2 right-1.5 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-neutral-200 py-1.5 pr-4 pl-3 text-sm font-medium text-neutral-800 transition-all hover:bg-neutral-300 active:scale-[0.97]"
		>
			{#if copied}
				<IconCheck size={16} class="text-green-600" />
				Copied
			{:else}
				<IconCopy size={16} />
				Copy
			{/if}
		</button>
	</div>
</div>
