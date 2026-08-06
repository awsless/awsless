import { h, Store, t } from 'awsless'
import { tasks } from '../table'

// Runs daily in production - invoke it manually from the dev dashboard.
export default h.cron(async () => {
	const list = await t.scan(tasks)
	const done = list.items.filter(task => task.done)

	for (const task of done) {
		await t.deleteItem(tasks, { id: task.id })
	}

	await Store.todo.exports.put(
		`cleanup/${crypto.randomUUID()}.json`,
		JSON.stringify({ removed: done.map(task => task.id) })
	)

	return { removed: done.length }
})
