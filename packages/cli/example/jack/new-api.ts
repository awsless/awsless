import { Search, Table, Topic, handle, s, search, store, t, table, topic, v } from 'awsless'
import { randomUUID } from 'crypto'

const LoginTopic = topic.define(
	Topic.login,
	v.object({
		user: v.string(),
	})
)

await topic.publish(LoginTopic, {
	user: 'John',
})

const users = t.define(
	Table.stack.users,
	t.object({
		id: t.uuid(),
		name: t.string(),
	})
)

const user: t.Infer<typeof users> = {
	id: randomUUID(),
	user: 'John',
}

await table.get(users, { id: 1 })
await table.put(users, user)
await table.delete(users, { id: 1 })
await table.query(users)
await table.transactWrite(users)

const games = s.define(
	Search.stack.games,
	s.object({
		id: s.uuid(),
		name: s.string(),
	})
)

await search.put(games, {
	user: 'John',
})

const files = store.define(Store.stack.files)

await store.put(files, 'lol')
await store.has(files, 'lol')
await store.get(files, 'lol')
await store.delete(files, 'lol')

export default handle.topic.subscribe(LoginTopic, event => {
	console.log(event)
})

export const func = handle.func(async () => {})
export const task = handle.task(async () => {})
export const cron = handle.cron(async () => {})

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

export const site = handle.site(async request => {})
export const queue = handle.queue(v.object(), async event => {})
export const failure = handle.onFailure(async event => {})
export const error = handle.onErrorLog(async event => {})

export const stream = handle.table.stream(users, async records => {
	console.log(records)
})

export const event = handle.store.event(users, async records => {
	console.log(records)
})

export const sub = handle.pubsub.connected(async event => {
	console.log(event)
})

export const sub = handle.pubsub.disconnected(async event => {
	console.log(event)
})
