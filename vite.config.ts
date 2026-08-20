import tailwindcss from '@tailwindcss/vite'
import adapter from 'svelte-adapter-bun'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export const svelteConfig = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	adapter: adapter(),
	experimental: {
		remoteFunctions: true
	}
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(svelteConfig)],
	server: {
		port: parseInt(process.env.PORT || '5173'),
		host: process.env.HOST || 'localhost'
	}
})
