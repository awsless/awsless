import { Handler } from '@awsless/lambda'
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
	date: Date | string

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
	// The failure event has no schema yet, so the unknown event input
	// narrows to the structural FailureEvent type.
	return consumer(undefined, handle as unknown as Handler)
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
	return consumer(onErrorLogSchema as ErrorSchema, handle)
}
