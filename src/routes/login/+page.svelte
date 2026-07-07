<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { authClient } from '$lib/auth-client'
	import { site } from '$lib/site-config'

	let step: 'email' | 'code' = $state('email')
	let email = $state('')
	let code = $state('')
	let pending = $state(false)
	let errorMessage: string | null = $state(null)

	async function sendCode(event: SubmitEvent) {
		event.preventDefault()
		pending = true
		errorMessage = null

		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email: email.trim(),
			type: 'sign-in'
		})
		pending = false

		if (error) {
			errorMessage = error.message ?? 'Could not send the code — try again'
			return
		}
		step = 'code'
	}

	async function verifyCode(event: SubmitEvent) {
		event.preventDefault()
		pending = true
		errorMessage = null

		const { error } = await authClient.signIn.emailOtp({
			email: email.trim(),
			otp: code.trim()
		})
		pending = false

		if (error) {
			errorMessage = error.message ?? 'That code didn’t work — try again'
			return
		}
		await goto(resolve('/(app)/feeds'), { invalidateAll: true })
	}
</script>

<svelte:head>
	<title>Log in — {site.name}</title>
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
	<h1 class="text-2xl font-semibold tracking-tight-md">Log in</h1>

	{#if step === 'email'}
		<p class="mt-2 text-neutral-600">We’ll email you a 6-digit code — no password needed.</p>
		<form onsubmit={sendCode} class="mt-6 flex flex-col gap-3">
			<input
				type="email"
				name="email"
				required
				autocomplete="email"
				placeholder="you@example.com"
				bind:value={email}
				class="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 outline-none focus:border-neutral-500"
			/>
			<button
				type="submit"
				disabled={pending}
				class="rounded-full bg-neutral-800 px-5 py-2.5 font-medium text-white transition-colors hover:bg-neutral-900 disabled:opacity-50"
			>
				{pending ? 'Sending…' : 'Email me a code'}
			</button>
		</form>
	{:else}
		<p class="mt-2 text-neutral-600">
			Enter the code we sent to <span class="font-medium text-neutral-900">{email}</span>
		</p>
		<form onsubmit={verifyCode} class="mt-6 flex flex-col gap-3">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				name="code"
				required
				autofocus
				inputmode="numeric"
				pattern="[0-9]*"
				maxlength="6"
				autocomplete="one-time-code"
				placeholder="123456"
				bind:value={code}
				class="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-neutral-500"
			/>
			<button
				type="submit"
				disabled={pending || code.trim().length < 6}
				class="rounded-full bg-neutral-800 px-5 py-2.5 font-medium text-white transition-colors hover:bg-neutral-900 disabled:opacity-50"
			>
				{pending ? 'Checking…' : 'Log in'}
			</button>
			<button
				type="button"
				class="text-sm text-neutral-500 hover:text-neutral-800"
				onclick={() => {
					step = 'email'
					code = ''
					errorMessage = null
				}}
			>
				Use a different email
			</button>
		</form>
	{/if}

	{#if errorMessage}
		<p class="mt-4 text-sm text-rose-600">{errorMessage}</p>
	{/if}
</main>
