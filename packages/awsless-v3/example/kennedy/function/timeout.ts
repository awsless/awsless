export default () => {
	return setTimeout(resolve => {
		resolve({
			statusCode: 200,
			body: '',
		})
	}, 20 * 1000)
}
