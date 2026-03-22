import { LambdaContext } from '..'
import { normalizeError } from '../helpers/error'

class EnhandedError extends Error {
	input: unknown
	requestId?: string
	functionName?: string
	functionVersion?: string
	memoryLimit?: string
	remainingTime?: number
}

export const enhanceError = (maybeError: unknown, input: unknown, context?: LambdaContext) => {
	const cause = normalizeError(maybeError)

	const error = new EnhandedError(cause.message, {
		cause,
	})

	// error.cause = cause
	error.input = input

	if (context) {
		error.requestId = context.awsRequestId
		error.functionName = context.functionName
		error.functionVersion = context.functionVersion
		error.memoryLimit = context.memoryLimitInMB
		error.remainingTime = context.getRemainingTimeInMillis()
	}

	return error
}
