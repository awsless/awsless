import { boolean, define, number, object, string } from '@awsless/dynamodb'

export type Todo = {
	id: string
	title: string
	done: boolean
	createdAt: number
}

export const todoTable = define('app-kennedy--stack--table--todos', {
	hash: 'id',
	schema: object({
		id: string(),
		title: string(),
		done: boolean(),
		createdAt: number(),
	}),
})
