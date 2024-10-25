export default async (event: { token: string }) => {
	console.log(event)

	return {
		authorized: true,
		context: {
			token: event.token,
		},
		ttl: '1 hour',
	}
}
