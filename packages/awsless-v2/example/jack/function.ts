// import { string } from 'zod'

import { randomUUID } from 'crypto'

export default () => {
	// console.log('HELLO !!!')

	// string()

	// throw new Error('My Own Error')

	return Promise.resolve({
		statusCode: 200,
		headers: {
			'content-type': 'application/json',
		},
		body: randomUUID(),
	})
}
