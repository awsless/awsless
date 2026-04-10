import { invoke } from '@awsless/lambda'
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
import { CloudWatchLogsEvent } from 'aws-lambda'
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

type Error = {
	hash: string
	requestId: UUID
	level: 'warn' | 'error' | 'fatal'
	type: string
	message: string
	stackTrace?: string[]
	data?: unknown
}

const consumer = process.env.CONSUMER

if (!consumer) {
	throw new Error('CONSUMER environment variable is not set')
}

export default async (event: CloudWatchLogsEvent) => {
	const payload = Buffer.from(event.awslogs.data, 'base64')
	const unzipped = zlib.gunzipSync(new Uint8Array(payload))
	const result = safeParse(EventSchema, JSON.parse(unzipped.toString('utf-8')))

	if (!result.success) {
		console.log('Failed to parse log data', result.issues)
		return
	}

	const origin = result.output.logGroup.split('/').pop()!

	for (const logEvent of result.output.logEvents) {
		const error = parseError(logEvent.message, origin)

		if (!error) {
			continue
		}

		await invoke({
			name: consumer,
			type: 'Event',
			payload: {
				...error,
				origin,
				date: logEvent.timestamp,
			},
		})
	}
}

const parseError = (message: string, origin: string): Error | undefined => {
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
		const hash = createHash('sha256').update([origin, errorType, errorMessage, stackTrace].join('-')).digest('hex')

		return {
			hash,
			requestId,
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
			level,
			type: 'Error',
			message,
		}
	}

	return
}
