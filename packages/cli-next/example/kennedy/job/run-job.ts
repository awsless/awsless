import { Job } from 'awsless'

export default async () => {
	const result = await Job.job.worker({
		message: 'hello from lambda',
	})

	return {
		statusCode: 200,
		body: JSON.stringify(result),
	}
}
