import { randomUUID } from 'crypto'
import { string } from 'zod'

export default async (event: unknown) => {
	console.log(process.env.AWS_LAMBDA_FUNCTION_NAME, randomUUID())

	string()

	// throw new Error('My Own Error')

	// return Promise.resolve({
	// 	statusCode: 200,
	// 	headers: {
	// 		'content-type': 'application/json',
	// 	},
	// 	body: JSON.stringify(randomUUID()),
	// })

	return event
}
