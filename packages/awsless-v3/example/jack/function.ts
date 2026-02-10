import { randomUUID } from 'crypto'
import { string } from 'zod'
import { Config } from '../../src/server'

const id = randomUUID()

const unused = 'ABSSOJHAISUHDUISADHUIASHDUIHASIUDHIUASDHAI'

export default async (event: unknown) => {
	// console.log(Config.TEST)

	// console.log(process.env.AWS_LAMBDA_FUNCTION_NAME, randomUUID())

	// string()

	// throw new Error('My Own Error')

	// return Promise.resolve({
	// 	statusCode: 200,
	// 	headers: {
	// 		'content-type': 'application/json',
	// 	},
	// 	body: JSON.stringify(randomUUID()),
	// })

	return id
}
