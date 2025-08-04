import { putItem } from '@awsless/dynamodb'
import { stateTable } from './table'

export default async () => {
	await putItem(stateTable, {
		id: 1,
		state: 'ended',
	})
}
