import { applyRedaction, GenericSchema } from '@awsless/validate'
import { LambdaContext } from '..'
import { normalizeError } from '../helpers/error'

// The shared bundle stamps the dispatched route key onto the context.
export type RoutedLambdaContext = LambdaContext & { route?: string }

class EnhandedError extends Error {
	input: unknown
	route?: string
	requestId?: string
	functionName?: string
	functionVersion?: string
	memoryLimit?: string
	remainingTime?: number
}

export const enhanceError = (
	maybeError: unknown,
	schema: GenericSchema | undefined,
	input: unknown,
	context?: RoutedLambdaContext
) => {
	const cause = normalizeError(maybeError)

	const error = new EnhandedError(cause.message, {
		cause,
	})

	// error.cause = cause
	error.input = schema ? applyRedaction(schema, input) : input

	if (context) {
		if (typeof context.route === 'string') {
			// Set by the shared bundle, so errors can be attributed to the
			// logical resource that was running.
			error.route = context.route
		}

		error.requestId = context.awsRequestId
		error.functionName = context.functionName
		error.functionVersion = context.functionVersion
		error.memoryLimit = context.memoryLimitInMB
		error.remainingTime = context.getRemainingTimeInMillis()
	}

	return error
}
