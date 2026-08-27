import { randomUUID } from 'node:crypto'
import { putItem } from '@awsless/dynamodb'
import { s } from 'awsless'
import { todoSearch } from './search'
import { Todo, todoTable } from './table'

export default async (event: { title: string }) => {
	const todo: Todo = {
		id: randomUUID(),
		title: event.title,
		done: false,
		createdAt: new Date(),
	}

	await putItem(todoTable, todo)
	await s.indexItem(todoSearch, todo.id, { title: todo.title, done: todo.done })

	return todo
}
