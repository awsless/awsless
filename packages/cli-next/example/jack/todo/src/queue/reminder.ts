import { h, Task, v } from 'awsless'

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

			await Task.stats.log({ name: 'reminders', value: 1 })
		}
	}
)
