import { randomUUID } from 'node:crypto'
import { Config, PubSub, Task, h, t, v } from 'awsless'
import { taskCreated } from '../../../topics'
import { tasks } from '../table'

export default h.func(
	v.object({
		name: v.string(),
	}),
	async ({ name }) => {
		const limit = parseInt(Config.MAX_TASKS, 10)
		const list = await t.scan(tasks)

		if (list.items.length >= limit) {
			throw new Error(`The task limit of ${limit} is reached.`)
		}

		const task: t.Infer<typeof tasks> = {
			id: randomUUID(),
			name,
			done: false,
		}

		await t.putItem(tasks, task)

		await taskCreated(task)
		await Task.stats.log({ name: 'tasks', value: 1 })
		await PubSub.main.publish('tasks', 'create', task)

		return task
	}
)
