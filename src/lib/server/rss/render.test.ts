import { describe, expect, test } from 'bun:test'
import { renderRssFeed, type RssFeedItem } from './render'

const info = {
	title: 'Linus Tech Tips & Friends',
	channelUrl: 'https://www.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw',
	feedUrl: 'https://example.com/f/abc123.xml'
}

const item = (overrides: Partial<RssFeedItem> = {}): RssFeedItem => ({
	ytVideoId: 'S82W3hWDvZA',
	title: 'Cables & "Adapters" <tested>',
	description: 'First line with https://example.com/link\n\nSecond paragraph',
	videoUrl: 'https://www.youtube.com/watch?v=S82W3hWDvZA',
	thumbnailUrl: 'https://i4.ytimg.com/vi/S82W3hWDvZA/hqdefault.jpg',
	publishedAt: new Date('2026-07-06T16:53:00Z'),
	...overrides
})

describe('renderRssFeed', () => {
	test('escapes XML in titles and channel metadata', () => {
		const xml = renderRssFeed(info, [item()])
		expect(xml).toContain('<title>Linus Tech Tips &amp; Friends</title>')
		expect(xml).toContain('Cables &amp; &quot;Adapters&quot; &lt;tested&gt;')
		expect(xml).not.toContain('<tested>')
	})

	test('includes self link, guid, and RFC 822 pubDate', () => {
		const xml = renderRssFeed(info, [item()])
		expect(xml).toContain('<atom:link href="https://example.com/f/abc123.xml" rel="self"')
		expect(xml).toContain('<guid isPermaLink="false">yt:video:S82W3hWDvZA</guid>')
		expect(xml).toContain('<pubDate>Mon, 06 Jul 2026 16:53:00 GMT</pubDate>')
	})

	test('carries the thumbnail as media:thumbnail and inside content:encoded', () => {
		const xml = renderRssFeed(info, [item()])
		expect(xml).toContain(
			'<media:thumbnail url="https://i4.ytimg.com/vi/S82W3hWDvZA/hqdefault.jpg"/>'
		)
		expect(xml).toContain('<img src="https://i4.ytimg.com/vi/S82W3hWDvZA/hqdefault.jpg"')
	})

	test('linkifies URLs and preserves paragraphs in content:encoded', () => {
		const xml = renderRssFeed(info, [item()])
		expect(xml).toContain('<a href="https://example.com/link">')
		expect(xml).toContain('<p>Second paragraph</p>')
	})

	test('omits thumbnail markup when the video has none', () => {
		const xml = renderRssFeed(info, [item({ thumbnailUrl: null })])
		expect(xml).not.toContain('media:thumbnail')
		expect(xml).not.toContain('<img')
	})

	test('truncates long descriptions in the plain summary only', () => {
		const long = 'x'.repeat(600)
		const xml = renderRssFeed(info, [item({ description: long })])
		expect(xml).toContain(`<description>${'x'.repeat(500)}…</description>`)
		expect(xml).toContain('x'.repeat(600)) // full text still in content:encoded
	})

	test('renders an empty feed without items', () => {
		const xml = renderRssFeed(info, [])
		expect(xml).toContain('<channel>')
		expect(xml).not.toContain('<item>')
	})
})
