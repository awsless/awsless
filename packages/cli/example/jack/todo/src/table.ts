import { t, Table } from 'awsless'

// The hash key & indexes live in the stack file - only the runtime
// schema is defined in code.
export const tasks = Table.todo.tasks.define(
	t.object({
		id: t.uuid(),
		name: t.string(),
		done: t.boolean(),
	})
)
