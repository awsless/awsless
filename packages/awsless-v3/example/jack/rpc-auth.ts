export default async (event: { token: string }) => {
	console.log(event)

	return {
		authorized: true,
		lockKey: 'user-2',
		context: {
			token: event.token,
		},
		ttl: '1 hour',
	}
}
