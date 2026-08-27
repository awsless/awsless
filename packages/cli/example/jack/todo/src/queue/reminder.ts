import { h, Task, v } from 'awsless'
import { deliverReminder } from '../lib/deliver'

export default h.queue(
	v.object({
		id: v.uuid(),
		name: v.string(),
	}),
	async reminders => {
		for (const reminder of reminders) {
			// A poison message proves the on-failure routing.
			if (reminder.name === 'fail-me') {
				throw new Error(`Reminder failed for task: ${reminder.id}`)
			}

			// A poison message proving the sourcemap feature: the crash
			// throws a TypeError naming a minified identifier, which the
			// on-error-log consumer receives mapped back to this source.
			if (reminder.name === 'crash-me') {
				deliverReminder(reminder.id)
			}

			await Task.stats.log({ name: 'reminders', value: 1 })
		}
	}
)
