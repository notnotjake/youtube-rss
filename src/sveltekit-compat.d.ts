// @opensky/remotes 1.0 imports these types from the SvelteKit 2 entrypoint.
// SvelteKit 3 moved them to $app/server; re-export them until the helper updates.
declare module '@sveltejs/kit' {
	export type {
		RemoteForm,
		RemoteFormEnhanceInstance,
		RemoteFormInput,
		RemoteQueryUpdate
	} from '$app/server'
}

export {}
