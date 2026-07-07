import { schedulePollChannels } from './tasks/poll-channels'
import { scheduleWebsubRenewal } from './tasks/websub-renewal'

export function scheduledTasks() {
	console.log('Starting scheduled tasks')

	schedulePollChannels()
	scheduleWebsubRenewal()
}
