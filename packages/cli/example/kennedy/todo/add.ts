import { putItem } from '@awsless/dynamodb'
import { randomUUID } from 'node:crypto'
import { Todo, todoTable } from './table'

export default async (event: { title: string }) => {
	const todo: Todo = {
		id: randomUUID(),
		title: event.title,
		done: false,
		createdAt: Date.now(),
	}

	await putItem(todoTable, todo)

	return todo
}
