import { deleteItem } from '@awsless/dynamodb'
import { s } from 'awsless'
import { todoSearch } from './search'
import { todoTable } from './table'

export default async (event: { id: string }) => {
	await deleteItem(todoTable, { id: event.id })
	await s.deleteItem(todoSearch, event.id)

	return { id: event.id }
}
