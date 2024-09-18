const defs = {
	createUser: '../user/create.ts',
	deleteUser: '../user/delete.ts',
}

const api = createClient(() => ({
	endpoint: import.env.TRPC_CASINO_ENDPOINT,
	headers: {
		authentication: await getSession().getAccessToken(),
	},
}))

await api.mutate.createUser({
	name: 'Jack',
})

Promise.all([
	api.query.getUser({ name: 'Jack' }),
	api.query.getUser({ name: 'Jack' }),
	api.query.getUser({ name: 'Jack' }),
])

await api.batch(({ query }) => ({
	one: query.getUser({ name: 'Jack' }),
	two: query.getUser({ name: 'Jack' }),
	three: query.getUser({ name: 'Jack' }),
}))

Promise.all([
	// (-.-)
	api.getUser({ name: 'Jack' }),
	api.getUser({ name: 'Jack' }),
	api.getUser({ name: 'Jack' }),
])

/*
	POST /trpc
	{ default: { method: 'getUser', payload } }
*/

/*
	POST /trpc
	{
		one: { method: 'getUser', payload }
		two: { method: 'getUser', payload }
		three: { method: 'getUser', payload }
	}
*/
