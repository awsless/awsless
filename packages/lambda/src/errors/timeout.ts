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

	// Fire a second before the deadline, so the error is logged before
	// lambda kills the sandbox.
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
	} finally {
		clearTimeout(id)
	}
}
