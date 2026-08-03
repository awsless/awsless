import { Fn } from 'awsless'

export default async () => {
	const result = await Fn.stack.function({ from: 'standalone-caller' })

	return {
		fn: result,
		version: process.env.AWS_LAMBDA_FUNCTION_VERSION,
		standalone: process.env.STANDALONE,
	}
}
