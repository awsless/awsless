import { deleteItem } from '@awsless/dynamodb'
import { todoTable } from './table'

export default async (event: { id: string }) => {
	await deleteItem(todoTable, { id: event.id })

	return { id: event.id }
}
