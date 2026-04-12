export default async (event: unknown) => {
	return {
		statusCode: 201,
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(event),
	}
}
