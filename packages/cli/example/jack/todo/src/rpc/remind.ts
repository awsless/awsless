import { randomUUID } from 'node:crypto'
import { ExpectedError } from '@awsless/lambda'
import { h, Queue, t, v } from 'awsless'
import { tasks } from '../table'

export default h.func(v.object({ id: v.uuid() }), async ({ id }) => {
	const task = await t.getItem(tasks, { id })

	if (!task) {
		throw new ExpectedError('not-found', 'Not found')
	}

	await Queue.todo.reminders({ id: task.id, name: task.name }, { groupId: task.id, deduplicationId: randomUUID() })

	return task
})
