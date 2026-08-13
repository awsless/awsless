import { boolean, date, define, Infer, object, string } from '@awsless/dynamodb'
import { Table } from 'awsless'

export type Todo = Infer<typeof todoTable>

export const todoTable = define(Table.stack.todos, {
	hash: 'id',
	schema: object({
		id: string(),
		title: string(),
		done: boolean(),
		createdAt: date(),
	}),
})
