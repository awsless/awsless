export default event => {
	return Promise.resolve({
		event,
		version: 3,
	})
}
