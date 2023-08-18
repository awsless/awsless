
export default async (event:unknown) => {
	return {
		statusCode: 200,
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify(event),
	}
}
