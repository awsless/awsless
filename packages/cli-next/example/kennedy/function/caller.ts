import { seconds } from '@awsless/duration'
import { Fn, Task } from 'awsless'

export default async (event: { delay?: boolean }) => {
	const result = await Fn.stack.function({ from: 'caller' })
	const standalone = await Fn.stack.standalone({ from: 'caller' })

	await Task.stack.work({ from: 'caller-immediate' })

	if (event?.delay) {
		await Task.stack.work({ from: 'caller-delayed' }, { schedule: seconds(75) })
	}

	console.log('CALLER_RAN_V2', process.env.AWS_LAMBDA_FUNCTION_VERSION)

	return {
		fn: result,
		standalone,
		version: process.env.AWS_LAMBDA_FUNCTION_VERSION,
	}
}
