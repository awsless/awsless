
import { define, getItem, object, putItem, string } from '../../../../dynamodb/src/index.js'
import { invoke } from '../../../../lambda/src/index.js'
import { getFunctionName, getTableName } from '../../../src/index.js'
import redis from './redis.js'

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
