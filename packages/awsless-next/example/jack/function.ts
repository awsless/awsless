// import { string } from 'zod'

import { randomUUID } from 'crypto'

export default () => {
	console.log(process.env.AWS_LAMBDA_FUNCTION_NAME)

	// string()

	// throw new Error('My Own Error')

	return Promise.resolve({
		statusCode: 200,
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(randomUUID()),
	})
}
