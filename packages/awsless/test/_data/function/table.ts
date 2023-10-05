import { getTableName } from '../../../src.js'
import { define, getItem, object, putItem, string } from '../../../../dynamodb/src.js'

const table = define(getTableName('stats'), {
	hash: 'id',
	schema: object({
		id: string(),
		name: string(),
	})
})

export default async () => {
	await putItem(table, {
		id: '1',
		name: 'Hello World'
	})

	return await getItem(table, {
		id: '1'
	})
}
