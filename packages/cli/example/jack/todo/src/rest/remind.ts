import { randomUUID } from 'node:crypto'
import { h, Queue, v } from 'awsless'

const schema = v.object({
	id: v.uuid(),
	name: v.string(),
})

export default h.route(async ({ request }) => {
	const data = v.parse(schema, await request.json())

	await Queue.todo.reminders({ id: data.id, name: data.name }, { groupId: data.id, deduplicationId: randomUUID() })

	return Response.json({ queued: true })
})
