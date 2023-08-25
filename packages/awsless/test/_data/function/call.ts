
import { define, getItem, object, putItem, string } from '../../../../dynamodb/src'
import { invoke } from '../../../../lambda/src'
import { getFunctionName, getTableName } from '../../../src'
import redis from './redis'

const table = define(getTableName('stats', 'table'), {
	hash: 'id',
	schema: object({
		id: string(),
		name: string(),
	})
})

export default async () => {
	const value = await invoke<typeof redis>({
		name: getFunctionName('test', 'cache'),
		payload: undefined
	})

	if(value === null) {
		return 'ERROR'
	}

	await putItem(table, {
		id: '1',
		name: value
	})

	return await getItem(table, {
		id: '1'
	})
}
