import { GenericSchema } from '@awsless/validate'
import { Context } from 'aws-lambda'
import { enhanceError } from './enhanced'

export class TimeoutError extends Error {
	constructor(remainingTime: number) {
		super(`Lambda will timeout in ${remainingTime}ms`)
	}
}

// Logs a timeout a second before the deadline, so the error is logged before
// lambda kills the sandbox; answers the function that stops it.
export const startTimeoutWarning = (
	schema: GenericSchema | undefined,
	event: unknown,
	context: Context | undefined,
	log: (error: TimeoutError) => void
) => {
	if (!context) {
		return () => {}
	}

	const delay = Math.max(context.getRemainingTimeInMillis() - 1000, 1000)

	const id = setTimeout(() => {
		const timeoutError = new TimeoutError(context.getRemainingTimeInMillis())
		const enhancedError = enhanceError(timeoutError, schema, event, context)

		log(enhancedError)
		console.error(enhancedError)
	}, delay)

	return () => clearTimeout(id)
}
