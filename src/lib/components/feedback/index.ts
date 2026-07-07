// Progress components
export { default as ProgressBar } from './progress/bar.svelte'
export { default as ProgressRing } from './progress/ring.svelte'
export { default as ProgressRadial } from './progress/radial.svelte'
export { default as ProgressText } from './progress/text.svelte'
export { default as ProgressCountdown } from './progress/countdown.svelte'

// Suspense components
export { default as SuspenseBar } from './suspense/bar.svelte'
export { default as SuspenseSkeleton } from './suspense/skeleton.svelte'
export { default as SuspenseSpinner } from './suspense/spinner.svelte'
export { default as SuspenseText } from './suspense/text.svelte'

// Component families for convenient importing
import ProgressBar from './progress/bar.svelte'
import ProgressRing from './progress/ring.svelte'
import ProgressRadial from './progress/radial.svelte'
import ProgressText from './progress/text.svelte'
import ProgressCountdown from './progress/countdown.svelte'

import SuspenseBar from './suspense/bar.svelte'
import SuspenseSkeleton from './suspense/skeleton.svelte'
import SuspenseSpinner from './suspense/spinner.svelte'
import SuspenseText from './suspense/text.svelte'

export const Progress = {
	Bar: ProgressBar,
	Ring: ProgressRing,
	Radial: ProgressRadial,
	Text: ProgressText,
	Countdown: ProgressCountdown
}

export const Suspense = {
	Bar: SuspenseBar,
	Skeleton: SuspenseSkeleton,
	Spinner: SuspenseSpinner,
	Text: SuspenseText
}
