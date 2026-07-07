<script lang="ts">
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
	<div class="flex items-center gap-2">
		<input
			readonly
			{value}
			onfocus={(e) => e.currentTarget.select()}
			class="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 font-mono text-sm text-neutral-700 outline-none focus:border-neutral-400"
		/>
		<button
			onclick={copy}
			class="shrink-0 rounded-full bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-300"
		>
			{copied ? 'Copied' : 'Copy'}
		</button>
	</div>
</div>
