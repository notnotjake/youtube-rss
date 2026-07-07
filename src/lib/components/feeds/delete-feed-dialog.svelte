<script lang="ts">
	import { AlertDialog } from 'bits-ui'

	type Props = {
		feedTitle: string
		onConfirm: () => void
	}

	let { feedTitle, onConfirm }: Props = $props()
	let open = $state(false)
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Trigger
		class="rounded-full px-4 py-1.5 font-medium text-rose-600 transition-colors hover:bg-rose-50"
	>
		Delete feed
	</AlertDialog.Trigger>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-40 bg-black/30" />
		<AlertDialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-card"
		>
			<AlertDialog.Title class="text-lg font-semibold">Delete this feed?</AlertDialog.Title>
			<AlertDialog.Description class="mt-2 text-sm text-neutral-600">
				“{feedTitle}” will stop updating and its URL will stop working. Your RSS reader will show
				it as unreachable.
			</AlertDialog.Description>
			<div class="mt-6 flex justify-end gap-2">
				<AlertDialog.Cancel
					class="rounded-full bg-neutral-200 px-4 py-1.5 font-medium text-neutral-800 transition-colors hover:bg-neutral-300"
				>
					Cancel
				</AlertDialog.Cancel>
				<AlertDialog.Action
					onclick={onConfirm}
					class="rounded-full bg-rose-600 px-4 py-1.5 font-medium text-white transition-colors hover:bg-rose-700"
				>
					Delete
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
