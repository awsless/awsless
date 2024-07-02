import { string } from 'zod'

export default () => {
	// console.log('HELLO !!!')

	string()

	return Promise.resolve({
		statusCode: 200,
		headers: {
			'content-type': 'application/json',
		},
		body: 'HELLO',
	})
}
