import { ONE } from '@awsless/big-float'
import { mock, Queue } from 'awsless'
import cleanup from '../src/cron/cleanup'
import create from '../src/rpc/create'
import list from '../src/rpc/list'
import search from '../src/rpc/search'
import stats from '../src/rpc/stats'
import toggle from '../src/rpc/toggle'

describe('Todo', () => {
	it('create', async () => {
		const result = await create({
			name: 'My post',
		})

		expect(mock.topic.taskCreated).toHaveBeenCalled()
		expect(mock.pubsub.main).toHaveBeenCalled()
		expect(mock.task.stats.log).toHaveBeenCalled()

		expect(result).toStrictEqual({
			id: expect.any(String),
			name: 'My post',
			done: false,
		})
	})

	it('config', async () => {
		mock.config.MAX_TASKS = '1'

		await expect(create({ name: 'Over the limit' })).rejects.toThrow('task limit')

		mock.config.MAX_TASKS = '10'
	})

	it('search', async () => {
		const result = await search({ query: 'post' })

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 1,
			found: 1,
			items: [
				{
					id: expect.any(String),
					name: 'My post',
					done: false,
				},
			],
		})
	})

	it('stats', async () => {
		const result = await stats()

		expect(result).toStrictEqual(ONE)
	})

	it('list', async () => {
		const result = await list()

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [
				{
					id: expect.any(String),
					name: 'My post',
					done: false,
				},
			],
		})
	})

	it('remind runs the real queue consumer', async () => {
		const result = await list()
		const task = result.items[0]!

		await Queue.todo.reminders(
			{ id: task.id, name: task.name },
			{ groupId: task.id, deduplicationId: 'todo-test-1' }
		)

		expect(mock.queue.todo.reminders).toHaveBeenCalledTimes(1)
		// The real consumer ran & logged the reminder stat.
		expect(mock.task.stats.log).toHaveBeenCalledTimes(1)
	})

	it('a poison reminder surfaces its error', async () => {
		await expect(
			Queue.todo.reminders(
				{ id: crypto.randomUUID(), name: 'fail-me' },
				{ groupId: 'poison', deduplicationId: 'todo-test-2' }
			)
		).rejects.toThrow('Reminder failed')
	})

	it('toggle & cleanup', async () => {
		const before = await list()
		const id = before.items[0]!.id

		await toggle({ id })

		const result = await cleanup()

		expect(result).toStrictEqual({ removed: 1 })

		const after = await list()
		expect(after.items).toStrictEqual([])
	})
})
