import { config, fn, h, s, search, store, t, table, topic, v } from 'awsless'
import { randomUUID } from 'crypto'

const LoginTopic = topic.login.define(
	v.object({
		user: v.string(),
	})
)

await LoginTopic({
	user: 'John',
})

const users = table.stack.users.define(
	t.object({
		id: t.uuid(),
		name: t.string(),
	})
)

const user: t.Infer<typeof users> = {
	id: randomUUID(),
	user: 'John',
}

await users.get({ id: 1 })
await users.put(user)
await users.delete({ id: 1 })
await users.query()
await table.transactWrite([
	//
	users.get({ id: 1 }),
	users.get({ id: 1 }),
	users.get({ id: 1 }),
])

const games = search.stack.games.define(
	s.object({
		id: s.uuid(),
		name: s.string(),
	})
)

await games.put({
	user: 'John',
})

const files = store.stack.files.define(v.string())

await files.put('key', 'value')
await files.has('key')
await files.get('key')
await files.delete('key')

export default h.subscribe(LoginTopic, event => {
	console.log(event, config.apiKey)
})

export const func = h.func(async () => {
	await fn.stack.name()
	await task.stack.name()
	await queue.stack.name()
})

export const task = h.task(async () => {
	await task.stack.name()
})

export const cron = h.cron(async () => {})

export const route = h.route(
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

export const site = h.site(async request => {})
export const queue = h.queue(v.object(), async event => {})
export const failure = h.failure(async event => {})
export const error = h.error(async event => {})

export const stream = h.table.stream(users, async records => {
	console.log(records)
})

export const event = h.store.event(users, async records => {
	console.log(records)
})

export const sub = h.pubsub.connected(async event => {
	console.log(event)
})

export const sub = h.pubsub.disconnected(async event => {
	console.log(event)
})
