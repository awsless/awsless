
export default async (event:unknown) => {
	return {
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify(event),
	}
}
