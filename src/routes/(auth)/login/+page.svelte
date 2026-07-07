<script lang="ts">
	import { onMount } from 'svelte'
	import * as v from 'valibot'
	import { startLogin } from '$remotes/auth.remote'
	import { createValidation, createEnhancedForm } from '@opensky/remotes'

	import { createClass } from '@opensky/style'
	import { createShake } from '$ui/adapt/shake-behavior'
	import { wipeVertical } from '$ui/transition'
	import { fade, fly } from 'svelte/transition'
	import { IconChevronLeft, IconArrowRight } from '@tabler/icons-svelte'

	import { Suspense } from '$ui/feedback'
	import CodeInput from '$ui/auth/code-input.svelte'
	import { site } from '$lib/site-config'

	let { data } = $props()

	// Start login schema
	const startLoginSchema = v.object({
		identifier: v.pipe(v.string(), v.email('Invalid email'))
	})
	// Start login validator
	const startLoginValid = createValidation(startLogin)
	// Start login form helper
	const startLoginForm = createEnhancedForm(startLogin, {
		validation: startLoginValid,
		delayMs: 100,
		timeoutMs: 9000
	})

	let identifierInput = $state<HTMLInputElement>()

	const { translateX, triggerShake: incorrectShake } = createShake({
		amplitude: 7,
		shakes: 2,
		duration: 325
	})

	let showError = $derived(
		!startLoginForm.result &&
			(startLoginForm.error ||
				(startLoginValid.fields.identifier.issues &&
					(startLogin.fields.identifier.value()?.length ?? 0) > 0))
	)

	let serverErrorMessage = $state<string | null>(null)
	let errorMessages = $derived.by(() => {
		if (!showError) return []
		if (startLoginForm.error && !startLoginValid.fields.identifier.issues) {
			return [serverErrorMessage || 'Something went wrong, try again']
		}
		return startLoginValid.fields.identifier.issues ?? []
	})

	$effect(() => {
		if (startLogin.fields.identifier.value()) serverErrorMessage = ''
	})

	let startButtonAvailable = $derived(
		!startLoginForm.result &&
			!startLoginValid.fields.identifier.issues &&
			startLogin.fields.value()?.identifier &&
			(startLogin.fields.value()?.identifier?.length ?? 0) >= 5
	)

	function focusInput() {
		identifierInput?.focus()
	}

	function resetForm() {
		const current = startLogin.result?.identifier
		startLoginForm.reset()
		startLogin.fields.identifier.set(current ?? '')
	}

	onMount(() => {
		startLoginForm.reset()
		startLogin.fields.identifier.set('')
	})
</script>

<svelte:head>
	<title>Log in — {site.name}</title>
</svelte:head>

<!-- Apply gray background on second step -->
{#if startLoginForm.result}
	<div
		transition:fade={{ duration: 200 }}
		class="pointer-events-none absolute inset-0 z-0 h-full w-full bg-neutral-400/10"
	></div>
{/if}

<!-- Container inside the layout -->
<div class="z-10 flex h-full w-full max-w-116 items-center justify-center px-2">
	<!-- Login card container -->
	<div
		class={createClass(
			'relative flex min-h-40 w-full shrink-0 grow flex-col items-center transition-all duration-200',
			startLoginForm.result ? 'rounded-[1.8rem] bg-white p-4' : 'rounded-[1.9rem] bg-none p-3 px-5'
		)}
	>
		<!-- Color gradient on first step -->
		<div
			class={createClass(
				'top-0 left-0 z-0 hidden h-18 w-full rounded-t-[1.8rem] bg-linear-to-b from-[#E3F4FF] to-[#E8F9FF]/0 transition-all duration-200 sm:absolute sm:z-auto sm:block',
				startLoginForm.result ? 'opacity-0' : 'opacity-100'
			)}
		></div>

		<!-- Message shown on first step -->
		{#if !startLoginForm.result}
			<div
				transition:wipeVertical={{ duration: 400 }}
				class="z-10 mb-6 w-full flex-col items-center justify-center px-7 pt-2 text-center"
			>
				<h2
					class="animate-fade-in-scale text-[1.33rem] leading-loose font-[550] tracking-tight-md text-black"
				>
					{data?.title}
				</h2>
				<p
					class="animate-fade-in-scale text-[1.05rem] leading-4 font-[430] tracking-tight-lg text-neutral-500"
				>
					{data?.text}
				</p>
			</div>
		{/if}

		<!-- Email input field -->
		<div
			style:transform="translateX({$translateX}px)"
			class={createClass(
				'group relative z-10 flex h-12 w-full items-center overflow-hidden rounded-2xl focus-within:outline-2 focus-within:outline-blue-500',
				startLoginForm.result ? 'bg-neutral-50' : 'bg-neutral-100',
				showError && 'outline-[0.12rem] outline-rose-400'
			)}
		>
			{#if !startLoginForm.result}
				<form
					class="flex h-full w-full items-center"
					{...startLogin.preflight(startLoginSchema).enhance(async (opts) =>
						startLoginForm.enhance(opts, {
							onSubmit: () => {
								serverErrorMessage = null
							},
							onIssues: () => {
								incorrectShake()
							},
							onError: ({ error }) => {
								const err = error as { status?: number; body?: { message?: string } }
								const message: string | null = err?.body?.message || null
								serverErrorMessage = message
								incorrectShake()
							}
						})
					)}
				>
					<!-- Identifier input -->
					<input
						{...startLogin.fields.identifier.as('email')}
						{...startLoginValid.fields.identifier.handlers}
						bind:this={identifierInput}
						autocomplete="username"
						placeholder="Continue with email"
						aria-label="Enter your email"
						class="h-full w-full grow pl-4 font-[450] text-zinc-900 transition-all outline-none selection:bg-sky-200 selection:text-blue-600 placeholder:font-[450] placeholder:text-neutral-400"
					/>

					<!-- Gradient State Indicator -->
					<!-- Button Available -->
					<div
						class={createClass(
							'pointer-events-none absolute top-0 right-0 z-0 h-full w-18 bg-linear-to-l from-[#4496FF] to-[rgba(45,169,255,0.00)]',
							startButtonAvailable ? 'w-18 opacity-20' : 'w-0 opacity-0'
						)}
					></div>
					<!-- Errors/Issues Present -->
					<div
						class={createClass(
							'pointer-events-none absolute top-0 right-0 z-0 h-full w-18 bg-linear-to-l from-rose-400/60 to-rose-300/0',
							showError ? 'w-18 opacity-25' : 'w-0 opacity-0'
						)}
					></div>

					<!-- Button: either continue or error alert -->
					<div class="flex h-full shrink-0 items-center justify-end pr-2">
						{#if startLoginForm.delayed}
							<Suspense.Spinner />
						{:else}
							<button type="submit" class="group" disabled={!startButtonAvailable}>
								<IconArrowRight
									stroke={3}
									size={26}
									class={createClass(
										'pointer-events-none transition-colors duration-300 group-disabled:text-neutral-500',
										startButtonAvailable ? 'text-blue-vibrant' : 'text-neutral-400',
										startLoginValid.fields.identifier.issues && 'text-neutral-400'
									)}
								/>
							</button>
						{/if}
					</div>
				</form>
			{:else}
				<!-- Second step shows back button -->
				<button onclick={resetForm} class="flex h-full w-full items-center justify-center">
					<div in:fade>
						<IconChevronLeft
							class="absolute inset-0 h-full text-neutral-400 group-hover:text-neutral-700"
						/>
					</div>
					<p
						in:fly={{ x: -100, opacity: 0.5, duration: 500 }}
						class="flex h-full w-full items-center justify-center font-[450] text-neutral-500 group-hover:text-neutral-700"
					>
						{startLogin.result?.identifier || 'Continue Login'}
					</p>
				</button>
			{/if}
		</div>

		<!-- Reserve error message space on step one to avoid layout shift -->
		{#if !startLoginForm.result}
			<div class="flex h-10 w-full items-center justify-center py-2.5">
				<div
					transition:wipeVertical={{ delay: 300 }}
					class={createClass(
						'flex justify-center',
						!errorMessages.length && 'pointer-events-none opacity-0'
					)}
				>
					{#each errorMessages as message (message)}
						<button class="cursor-pointer font-[450] text-rose-500" onclick={focusInput}>
							{message}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Second step ui -->
		{#if startLoginForm.result && startLogin.result}
			<div transition:wipeVertical class="flex w-full flex-col items-center gap-7 pt-14 pb-3">
				<CodeInput codeSent={startLogin.result.codeSent} identifier={startLogin.result.identifier} />
			</div>
		{/if}
	</div>
</div>
