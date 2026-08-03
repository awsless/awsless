import { Search, Table, Topic, handle, s, search, store, t, table, topic, v } from 'awsless'
import { randomUUID } from 'crypto'

const LoginTopic = Topic.login(
	v.object({
		user: v.string(),
	})
)

await LoginTopic.publish({
	user: 'John',
})

const users = Table.stack.users(
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

const games = Search.stack.games(
	s.object({
		id: s.uuid(),
		name: s.string(),
	})
)

await games.put({
	user: 'John',
})

const files = Store.stack.files(v.string())

await files.put('key', 'value')
await files.has('key')
await files.get('key')
await files.delete('key')

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
