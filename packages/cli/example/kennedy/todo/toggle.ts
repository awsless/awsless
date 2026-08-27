import { getItem, putItem } from '@awsless/dynamodb'
import { s } from 'awsless'
import { todoSearch } from './search'
import { Todo, todoTable } from './table'

export default async (event: { id: string }) => {
	const todo = await getItem(todoTable, { id: event.id })

	if (!todo) {
		throw new Error(`Unknown todo: ${event.id}`)
	}

	const updated: Todo = {
		...todo,
		done: !todo.done,
	}

	await putItem(todoTable, updated)
	await s.indexItem(todoSearch, updated.id, { title: updated.title, done: updated.done })

	return updated
}
