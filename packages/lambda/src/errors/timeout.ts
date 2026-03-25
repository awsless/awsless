import { GenericSchema } from '@awsless/validate'
import { Context } from 'aws-lambda'
import { enhanceError } from './enhanced'

export class TimeoutError extends Error {
	constructor(remainingTime: number) {
		super(`Lambda will timeout in ${remainingTime}ms`)
	}
}

export const createTimeoutWrap = async <R>(
	schema: GenericSchema | undefined,
	event: unknown,
	context: Context | undefined,
	log: (error: TimeoutError) => void,
	callback: () => R
): Promise<R> => {
	if (!context) {
		return callback()
	}

	// Remove 1 second from the remaining time to give us time to log the error
	// before the lambda times out.
	// Also make sure we don't set a timeout that is less than 1 second.

	const time = context.getRemainingTimeInMillis()
	const delay = Math.max(time - 1000, 1000)

	const id = setTimeout(() => {
		const timeoutError = new TimeoutError(context.getRemainingTimeInMillis())
		const enhancedError = enhanceError(timeoutError, schema, event, context)

		log(enhancedError)
		console.error(enhancedError)
	}, delay)

	try {
		return await callback()
		// } catch(error) {
		// 	console.log(error);

		// 	throw error
	} finally {
		clearTimeout(id)
	}
}
