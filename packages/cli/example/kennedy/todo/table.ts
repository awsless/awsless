import { boolean, date, Infer, object, string } from '@awsless/dynamodb'
import { Table } from 'awsless'

export type Todo = Infer<typeof todoTable>

export const todoTable = Table.stack.todos.define(
	object({
		id: string(),
		title: string(),
		done: boolean(),
		createdAt: date(),
	})
)
