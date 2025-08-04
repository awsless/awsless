import { minutes } from '@awsless/duration'
import { putItem } from '@awsless/dynamodb'
import { Task } from '../../../src/server'
import { stateTable } from './table'

export default async () => {
	await putItem(stateTable, {
		id: 1,
		state: 'started',
	})

	await Task.stack.end(undefined, {
		schedule: minutes(1),
	})
}
