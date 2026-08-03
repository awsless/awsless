import { Handler } from '@awsless/lambda'
import {
	array,
	date,
	InferOutput,
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

// The parsed log entry an error handler receives.
export type ErrorEvent = InferOutput<typeof onErrorLogSchema>

export type FailureEvent = {
	id: string
	date: Date | string
	type: string
	payload?: unknown
	source?: { resource?: string; event?: unknown }
	queue?: { name?: string }
	function?: { name?: string }
	error?: { type?: string; message?: string; stackTrace?: string[] }
} & Record<string, unknown>

type FailureHandler = (event: FailureEvent, context: Parameters<Handler>[1]) => unknown

export const failure = <H extends FailureHandler>(handle: H) => {
	// The failure event has no schema yet, so the unknown event input
	// narrows to the structural FailureEvent type.
	return consumer(undefined, handle as unknown as Handler)
}

export const error = <H extends Handler<typeof onErrorLogSchema>>(handle: H) => {
	return consumer(onErrorLogSchema, handle)
}
