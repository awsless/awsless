import { define, getItem, object, putItem, string } from '../../../../dynamodb/src/index.js'
import { getTableName } from '../../../old/index.js'

const table = define(getTableName('stats'), {
	hash: 'id',
	schema: object({
		id: string(),
		name: string(),
	}),
})

export default async () => {
	await putItem(table, {
		id: '1',
		name: 'Hello World',
	})

	return await getItem(table, {
		id: '1',
	})
}
