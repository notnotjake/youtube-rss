import { describe, expect, test } from 'bun:test'
import { evaluateVideo, type FeedRule } from './rules'

const video = (overrides: Partial<Parameters<typeof evaluateVideo>[0]> = {}) => ({
	title: 'Building a NAS from scratch',
	description: 'We build a NAS. Sponsored by Acme VPN.',
	isShort: false,
	...overrides
})

const rule = (overrides: Partial<FeedRule>): FeedRule => ({
	type: 'exclude',
	match: 'title',
	value: '',
	...overrides
})

describe('evaluateVideo — shorts toggle', () => {
	test('shorts are excluded by default', () => {
		const verdict = evaluateVideo(video({ isShort: true }), { includeShorts: false, rules: [] })
		expect(verdict.included).toBe(false)
		if (!verdict.included) expect(verdict.reason).toBe('Shorts are excluded')
	})

	test('shorts pass when the toggle is on', () => {
		const verdict = evaluateVideo(video({ isShort: true }), { includeShorts: true, rules: [] })
		expect(verdict.included).toBe(true)
	})

	test('regular videos pass regardless of the toggle', () => {
		expect(evaluateVideo(video(), { includeShorts: false, rules: [] }).included).toBe(true)
	})
})

describe('evaluateVideo — exclude rules', () => {
	test('excludes on case-insensitive title substring', () => {
		const verdict = evaluateVideo(video(), {
			includeShorts: false,
			rules: [rule({ value: 'nas' })]
		})
		expect(verdict.included).toBe(false)
		if (!verdict.included) expect(verdict.reason).toContain('nas')
	})

	test('title-scoped rules ignore the description', () => {
		const verdict = evaluateVideo(video(), {
			includeShorts: false,
			rules: [rule({ value: 'sponsored', match: 'title' })]
		})
		expect(verdict.included).toBe(true)
	})

	test('description-scoped rules match the description', () => {
		const verdict = evaluateVideo(video(), {
			includeShorts: false,
			rules: [rule({ value: 'sponsored', match: 'description' })]
		})
		expect(verdict.included).toBe(false)
	})

	test('both-scoped rules match either field', () => {
		const settings = {
			includeShorts: false,
			rules: [rule({ value: 'acme vpn', match: 'both' })]
		}
		expect(evaluateVideo(video(), settings).included).toBe(false)
		expect(evaluateVideo(video({ description: 'clean' }), settings).included).toBe(true)
	})

	test('empty rule values never match', () => {
		const verdict = evaluateVideo(video(), {
			includeShorts: false,
			rules: [rule({ value: '  ' })]
		})
		expect(verdict.included).toBe(true)
	})
})

describe('evaluateVideo — require rules', () => {
	test('included when any require rule matches', () => {
		const verdict = evaluateVideo(video(), {
			includeShorts: false,
			rules: [rule({ type: 'require', value: 'wan show' }), rule({ type: 'require', value: 'NAS' })]
		})
		expect(verdict.included).toBe(true)
	})

	test('excluded when no require rule matches', () => {
		const verdict = evaluateVideo(video(), {
			includeShorts: false,
			rules: [rule({ type: 'require', value: 'wan show' })]
		})
		expect(verdict.included).toBe(false)
		if (!verdict.included) expect(verdict.reason).toBe('No require keyword matches')
	})

	test('exclude rules win over require rules', () => {
		const verdict = evaluateVideo(video(), {
			includeShorts: false,
			rules: [rule({ type: 'require', value: 'NAS' }), rule({ type: 'exclude', value: 'scratch' })]
		})
		expect(verdict.included).toBe(false)
	})

	test('no rules at all passes everything non-short', () => {
		expect(evaluateVideo(video(), { includeShorts: false, rules: [] }).included).toBe(true)
	})
})
