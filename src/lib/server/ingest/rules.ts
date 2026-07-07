export type FeedRule = {
	type: 'exclude' | 'require'
	match: 'title' | 'description' | 'both'
	value: string
}

export type FeedSettings = {
	includeShorts: boolean
	rules: FeedRule[]
}

export type VideoFacts = {
	title: string
	description: string
	isShort: boolean
}

export type Verdict = { included: true } | { included: false; reason: string }

function ruleMatches(rule: FeedRule, video: VideoFacts): boolean {
	const needle = rule.value.trim().toLowerCase()
	if (!needle) return false

	const inTitle = video.title.toLowerCase().includes(needle)
	const inDescription = video.description.toLowerCase().includes(needle)

	if (rule.match === 'title') return inTitle
	if (rule.match === 'description') return inDescription
	return inTitle || inDescription
}

/**
 * Decides whether a video belongs in a feed under the given settings.
 *
 * A video is included iff it isn't a Short (unless the toggle allows them),
 * no exclude rule matches, and — when require rules exist — at least one
 * require rule matches. Matching is case-insensitive substring.
 */
export function evaluateVideo(video: VideoFacts, settings: FeedSettings): Verdict {
	if (video.isShort && !settings.includeShorts) {
		return { included: false, reason: 'Shorts are excluded' }
	}

	for (const rule of settings.rules) {
		if (rule.type === 'exclude' && ruleMatches(rule, video)) {
			return { included: false, reason: `Matches exclude “${rule.value}”` }
		}
	}

	const requireRules = settings.rules.filter((r) => r.type === 'require' && r.value.trim())
	if (requireRules.length > 0 && !requireRules.some((rule) => ruleMatches(rule, video))) {
		return { included: false, reason: 'No require keyword matches' }
	}

	return { included: true }
}
