import { Table, Topic, handle, t, table, topic, v } from 'awsless'

const defineApp = (object: any) => {}
const defineStack = (object: any) => {}

const LoginTopic = topic.define(
	'login',
	v.object({
		user: v.string(),
	})
)

export default defineApp({
	topics: [LoginTopic],
})

const loginSub = handle.subscribe(LoginTopic, event => {
	console.log(event)
})

export const stack1 = defineStack({
	subscribers: [loginSub],
})

export const func = handle.func(async () => {
	await topic.publish(LoginTopic, {
		user: 'John',
	})
})

export const task = handle.task(async () => {})

export const route = handle.route(
	{
		params: v.object({
			id: v.string(),
		}),
	},
	request => {
		return new Response(`hello ${request.params.id}`, {
			status: 200,
		})
	}
)

export const stream = handle.table.stream(users, async records => {
	console.log(records)
})

export const event = handle.store.event(users, async records => {
	console.log(records)
})

export const stream = handle.storeEvent(users, async records => {
	console.log(records)
})
