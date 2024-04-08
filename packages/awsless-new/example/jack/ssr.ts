export default () => {
	// console.log('HELLO !!!')

	return Promise.resolve({
		statusCode: 200,
		headers: {
			'content-type': 'text/html',
		},
		body: '<h1>HELLO!</h1>',
	})
}
