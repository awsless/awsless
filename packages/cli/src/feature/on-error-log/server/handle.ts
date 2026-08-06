import {
	array,
	literal,
	looseObject,
	number,
	object,
	optional,
	picklist,
	pipe,
	safeParse,
	string,
	toLowerCase,
	transform,
	uuid,
} from '@awsless/validate'
import type { CloudWatchLogsEvent, Context } from 'aws-lambda'
import { createHash, UUID } from 'crypto'
import * as zlib from 'zlib'

// Runtime error log (thrown by function code)
const RuntimeErrorSchema = object({
	timestamp: string(),
	level: pipe(string(), toLowerCase(), picklist(['error', 'warn', 'fatal'])),
	requestId: uuid(),
	message: looseObject({
		errorType: string(),
		errorMessage: string(),
		stackTrace: optional(array(string())),
	}),
})

// Simple error log (plain string message)
const SimpleErrorSchema = object({
	timestamp: string(),
	level: pipe(string(), toLowerCase(), picklist(['error', 'warn', 'fatal'])),
	requestId: uuid(),
	message: string(),
})

// System error log (timeout, OOM)
const SystemErrorSchema = object({
	type: literal('platform.report'),
	time: string(),
	record: looseObject({
		requestId: uuid(),
		status: picklist(['timeout', 'error', 'failure']),
		errorType: optional(string()),
	}),
})

const EventSchema = object({
	logGroup: string(),
	logEvents: array(
		object({
			id: string(),
			message: string(),
			timestamp: pipe(
				number(),
				transform(v => new Date(v))
			),
		})
	),
})

type ErrorLog = {
	hash: string
	requestId: UUID
	origin: string
	level: 'warn' | 'error' | 'fatal'
	type: string
	message: string
	stackTrace?: string[]
	data?: unknown
}

export type ErrorEvent = ErrorLog & {
	date: Date
}

// The handler runs in its own stand-alone lambda whose log group is
// never subscribed to the error logs, so an error produced by the
// consumer can never be consumed again & loop forever.
export const createHandler = (consumer: (event: ErrorEvent) => Promise<unknown>) => {
	return async (event: CloudWatchLogsEvent, context: Context) => {
		try {
			const payload = Buffer.from(event.awslogs.data, 'base64')
			const unzipped = zlib.gunzipSync(new Uint8Array(payload))
			const result = safeParse(EventSchema, JSON.parse(unzipped.toString('utf-8')))

			if (!result.success) {
				console.info('Failed to parse log data', result.issues)
				return
			}

			const origin = result.output.logGroup.split('/').pop()!

			for (const logEvent of result.output.logEvents) {
				const error = parseError(logEvent.message, origin)

				if (!error) {
					continue
				}

				// A hung consumer is abandoned right before the invocation
				// deadline, so the log handling always finishes cleanly
				// instead of timing out the whole invocation.
				const invoke = Promise.resolve()
					.then(() => {
						return consumer({
							...error,
							date: logEvent.timestamp,
						})
					})
					.catch(() => {})

				const deadline = Math.max(0, context.getRemainingTimeInMillis() - 3_000)

				await Promise.race([invoke, new Promise(resolve => setTimeout(resolve, deadline))])
			}
		} catch (error) {
			console.info('Failed to consume the error logs', error)
		}
	}
}

const parseError = (message: string, origin: string): ErrorLog | undefined => {
	let parsed
	try {
		parsed = JSON.parse(message)
	} catch {
		return
	}

	// Runtime error (thrown by function code)
	const runtimeError = safeParse(RuntimeErrorSchema, parsed)
	if (runtimeError.success) {
		const { requestId, level } = runtimeError.output
		const { errorType, errorMessage, stackTrace, ...extra } = runtimeError.output.message

		// Errors thrown inside the shared bundle carry the route key of the
		// logical resource that was running, which names the origin better
		// than the bundles own function name.
		if (typeof extra.route === 'string') {
			origin = extra.route
			delete extra.route
		}

		const hash = createHash('sha256').update([origin, errorType, errorMessage, stackTrace].join('-')).digest('hex')

		return {
			hash,
			requestId,
			origin,
			level,
			type: errorType,
			message: errorMessage,
			stackTrace,
			data: Object.keys(extra).length ? extra : undefined,
		}
	}

	// Platform error (timeout, OOM)
	const systemError = safeParse(SystemErrorSchema, parsed)
	if (systemError.success) {
		const { requestId, status, errorType, ...extra } = systemError.output.record
		const hash = createHash('sha256').update([origin, errorType, status].join('-')).digest('hex')
		return {
			hash,
			requestId,
			origin,
			level: 'fatal',
			type: errorType ?? status,
			message: `Fatal system error: ${errorType ?? status}`,
			data: Object.keys(extra).length ? extra : undefined,
		}
	}

	// Simple error (plain string message)
	const simpleError = safeParse(SimpleErrorSchema, parsed)
	if (simpleError.success) {
		const { requestId, level, message } = simpleError.output
		const hash = createHash('sha256').update([origin, message].join('-')).digest('hex')
		return {
			hash,
			requestId,
			origin,
			level,
			type: 'Error',
			message,
		}
	}

	return
}
