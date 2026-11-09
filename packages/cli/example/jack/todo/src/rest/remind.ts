import { randomUUID } from 'node:crypto'
import { h, Queue, v } from 'awsless'

export default h.route(
	{
		body: v.object({
			id: v.uuid(),
			name: v.string(),
		}),
	},
	async ({ data }) => {
		await Queue.todo.reminders(
			{ id: data.id, name: data.name },
			{ groupId: data.id, deduplicationId: randomUUID() }
		)

		return Response.json({ queued: true })
	}
)
