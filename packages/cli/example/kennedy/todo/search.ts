import { s, Search } from 'awsless'

export const todoSearch = Search.stack.todos.define(
	s.object({
		title: s.string(),
		done: s.boolean(),
	})
)
