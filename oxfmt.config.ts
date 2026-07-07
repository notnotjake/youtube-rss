import { defineConfig } from 'oxfmt'

export default defineConfig({
	semi: false,
	useTabs: true,
	printWidth: 100,
	singleQuote: true,
	trailingComma: 'none',
	sortTailwindcss: {
		stylesheet: './src/lib/theme/app.css'
	},
	sortPackageJson: false,
	ignorePatterns: [
		'package-lock.json',
		'pnpm-lock.yaml',
		'yarn.lock',
		'bun.lock',
		'bun.lockb',
		'/.svelte-kit/',
		'/build/',
		'/db/migrations/',
		'/static/',
		// Byte-accurate copies of real YouTube responses — never reformat
		'**/fixtures/'
	]
})
