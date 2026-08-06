import { s, Search } from 'awsless'

export const searchIndex = Search.todo.tasks.define(
	s.object({
		id: s.uuid(),
		name: s.string(),
		done: s.boolean(),
	})
)
