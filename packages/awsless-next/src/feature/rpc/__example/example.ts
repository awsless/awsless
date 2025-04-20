const defs = {
	createUser: '../user/create.ts',
	deleteUser: '../user/delete.ts',
}

const api = createClient<Schema>(() => ({
	endpoint: import.env.TRPC_CASINO_ENDPOINT,
	headers: {
		authentication: await getSession().getAccessToken(),
	},
}))

await api.createUser({
	name: 'Jack',
})

api.getUser({ name: 'Jack' })
api.getUser({ name: 'Jack' })
api.getUser({ name: 'Jack' })

Promise.all([api.getUser({ name: 'Jack' }), api.getUser({ name: 'Jack' }), api.getUser({ name: 'Jack' })])

Promise.all([
	// (-.-)
	api.getUser({ name: 'Jack' }),
	api.getUser({ name: 'Jack' }),
	api.getUser({ name: 'Jack' }),
])

/*
	POST /trpc
	[
		{ method: 'getUser', payload },
		{ method: 'getUser', payload },
		{ method: 'getUser', payload }
	]
*/

/*
	POST /trpc
	{
		one: { method: 'getUser', payload }
		two: { method: 'getUser', payload }
		three: { method: 'getUser', payload }
	}
*/
