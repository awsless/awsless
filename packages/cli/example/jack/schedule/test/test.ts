import { mockDynamoDB } from '@awsless/dynamodb'
import { mockTask } from '../../../../src/server'
import start from '../start'
import { stateTable } from '../table'

describe('test', () => {
	// mockDynamoDB({
	// 	tables: [stateTable],
	// })

	const task = mockTask(mock => {
		mock.stack.end()
	})

	it('start', async () => {
		await start()
		expect(task.stack.end).toBeCalledTimes(2)
	})
})
