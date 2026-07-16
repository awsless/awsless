export default async () => {
	return {
		statusCode: 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
		},
		body: '<h1>Kennedy SSR</h1>',
	}
}
