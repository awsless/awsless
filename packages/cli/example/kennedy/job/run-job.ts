import { Job } from '../../../src/server'

export default async () => {
	const result = await Job.stack.worker({ message: 'hello from lambda' })

	return {
		statusCode: 200,
		body: JSON.stringify(result),
	}
}
