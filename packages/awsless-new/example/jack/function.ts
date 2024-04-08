export default () => {
	// console.log('HELLO !!!')

	return Promise.resolve({
		statusCode: 200,
		headers: {
			'content-type': 'application/json',
		},
		body: 'HELLO',
	})
}
