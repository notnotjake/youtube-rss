<script lang="ts">
	import { Switch, Label } from 'bits-ui'

	type Props = {
		checked: boolean
		label: string
		description?: string
		id?: string
	}

	let { checked = $bindable(), label, description, id = 'switch' }: Props = $props()
</script>

<div class="flex items-center justify-between gap-4">
	<div class="flex flex-col">
		<Label.Root for={id} class="font-medium">{label}</Label.Root>
		{#if description}
			<span class="text-sm text-neutral-500">{description}</span>
		{/if}
	</div>
	<Switch.Root
		{id}
		bind:checked
		class="h-[26px] w-[44px] shrink-0 rounded-full bg-neutral-300 p-[3px] transition-colors duration-150 ease-out-quart data-[state=checked]:bg-neutral-800"
	>
		<Switch.Thumb
			class="block size-[20px] rounded-full bg-white shadow-sm transition-transform duration-150 ease-out-quart data-[state=checked]:translate-x-[18px]"
		/>
	</Switch.Root>
</div>
