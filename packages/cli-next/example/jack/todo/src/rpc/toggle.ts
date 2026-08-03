import { ExpectedError } from '@awsless/lambda'
import { h, t, v } from 'awsless'
import { tasks } from '../table'

export default h.func(v.object({ id: v.uuid() }), async ({ id }) => {
	const task = await t.getItem(tasks, { id })

	if (!task) {
		throw new ExpectedError('not-found', 'Not found')
	}

	await t.updateItem(
		tasks,
		{ id },
		{
			update: e => e.done.set(!task.done),
		}
	)

	return task
})
