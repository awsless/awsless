import { ExpectedError, Handler, isErrorResponse, ViewableError } from '@awsless/lambda'
import {
	array,
	date,
	GenericSchema,
	InferInput,
	isoTimestamp,
	object,
	optional,
	picklist,
	pipe,
	string,
	transform,
	union,
	unknown,
} from '@awsless/validate'
import { consumer } from './util.js'

/** The event the app level on-failure handler receives for every failed async consumer. */
export type FailureEvent = {
	/** The unique id of the failure. */
	id: string

	/** The moment the failure happened. */
	date: Date

	/** The kind of consumer that failed, like "queue" or "dynamodb-stream". */
	type: string

	/** The original payload the failed consumer received. */
	payload?: unknown

	/** The resource the failure originated from. */
	source?: { resource?: string; event?: unknown }

	/** The queue holding the failed message, for queue failures. */
	queue?: { name?: string }

	/** The lambda function the failure happened in. */
	function?: { name?: string }

	/** The error that caused the failure. */
	error?: { type?: string; message?: string; stackTrace?: string[] }
} & Record<string, unknown>

type FailureHandler = (event: FailureEvent, context: Parameters<Handler>[1]) => unknown

export const failure = <H extends FailureHandler>(handle: H) => {
	// Fed by sqs & bounded by its redrive: a bad record retries, then
	// dead-letters, instead of being acknowledged as an error response.
	return consumer(undefined, handle as unknown as Handler, true)
}

const onErrorLogSchema = object({
	hash: string(),
	requestId: string(),
	origin: string(),
	level: picklist(['warn', 'error', 'fatal']),
	type: string(),
	message: string(),
	stackTrace: optional(array(string())),
	data: optional(unknown()),
	date: union([
		date(),
		pipe(
			string(),
			isoTimestamp(),
			transform(v => new Date(v))
		),
	]),
})

/** The parsed log entry an error handler receives. */
export type ErrorEvent = {
	/** The stable hash of the error, grouping repeated occurrences. */
	hash: string

	/** The aws request id of the invocation that logged the error. */
	requestId: string

	/** The bundle route key the error originated from. */
	origin: string

	/** The severity of the log entry. */
	level: 'warn' | 'error' | 'fatal'

	/** The error type, like the class name of the thrown error. */
	type: string

	/** The error message. */
	message: string

	/** The stack trace lines of the error. */
	stackTrace?: string[]

	/** Extra structured data attached to the log entry. */
	data?: unknown

	/** The moment the error was logged. */
	date: Date
}

type ErrorSchema = GenericSchema<InferInput<typeof onErrorLogSchema>, ErrorEvent>

export const error = <H extends Handler<ErrorSchema>>(handle: H) => {
	const handler = consumer(onErrorLogSchema as ErrorSchema, handle, false)

	const skip = (error: { type: string; message: string }) => {
		console.warn(`The on-error-log consumer skipped a record it can't process (${error.type}): ${error.message}`)
	}

	// A record it can't process is dropped with a warning: throwing would
	// reach the failure destination, which logs, which re-enters here.
	return async (...args: Parameters<typeof handler>) => {
		try {
			const result = await handler(...args)

			if (isErrorResponse(result)) {
				skip(result.__error__)
				return
			}

			return result
		} catch (error) {
			if (error instanceof ExpectedError || error instanceof ViewableError) {
				skip(error)
				return
			}

			throw error
		}
	}
}
