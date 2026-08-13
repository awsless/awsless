import { h, Queue, v } from 'awsless'
import { randomUUID } from 'node:crypto'

export default h.route(
	{
		body: v.object({
			id: v.uuid(),
			name: v.string(),
		}),
	},
	async request => {
		await Queue.todo.reminders(
			{ id: request.data.id, name: request.data.name },
			{ groupId: request.data.id, deduplicationId: randomUUID() }
		)

		return Response.json({ queued: true })
	}
)
