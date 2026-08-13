import { Topic, v } from 'awsless'

export const taskCreated = Topic.taskCreated.define(
	v.object({
		id: v.uuid(),
		name: v.string(),
		done: v.boolean(),
	})
)
