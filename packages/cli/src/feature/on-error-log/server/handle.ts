import { createHash, UUID } from 'crypto'
import * as zlib from 'zlib'
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
import { formatSourcemapVersionKey } from '../keys.js'
import { createSymbolicator, SourcemapLoaders } from './sourcemap.js'

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
	// The stream name carries the version ("...[42]abc"), which picks
	// the sourcemaps of exactly the code that errored.
	logStream: optional(string()),
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

// Resolve a version's map prefix & its maps with plain s3 reads.
// Loaded lazily, so the module import never needs aws.
const createAwsLoaders = async (): Promise<SourcemapLoaders> => {
	const { GetObjectCommand, S3Client } = await import('@aws-sdk/client-s3')

	const s3 = new S3Client({})
	const bucket = process.env.SOURCEMAP_BUCKET!

	// Resolving undefined means "definitively absent" & caches, while a
	// throw (a throttle, a network blip) evicts & retries on the next
	// error - so only not-found answers stick.
	const read = async (key: string) => {
		try {
			const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))

			return result.Body?.transformToString()
		} catch (error) {
			if ((error as Error).name === 'NoSuchKey' || (error as Error).name === 'NotFound') {
				return undefined
			}

			throw error
		}
	}

	return {
		loadPrefix(functionName, version) {
			return read(formatSourcemapVersionKey(functionName, version))
		},
		loadMap(key) {
			return read(key)
		},
	}
}

// The handler runs in its own stand-alone lambda whose log group is
// never subscribed to the error logs, so an error produced by the
// consumer can never be consumed again & loop forever.
export const createHandler = (consumer: (event: ErrorEvent) => Promise<unknown>, loaders?: SourcemapLoaders) => {
	// Only exists when the deploy wired a sourcemap bucket - and stays
	// warm across invocations for its caches.
	let symbolicator: ReturnType<typeof createSymbolicator> | undefined

	const getSymbolicator = async () => {
		if (!symbolicator && (loaders || process.env.SOURCEMAP_BUCKET)) {
			symbolicator = createSymbolicator(loaders ?? (await createAwsLoaders()))
		}

		return symbolicator
	}

	return async (event: CloudWatchLogsEvent, context: Context) => {
		try {
			const payload = Buffer.from(event.awslogs.data, 'base64')
			const unzipped = zlib.gunzipSync(new Uint8Array(payload))
			const result = safeParse(EventSchema, JSON.parse(unzipped.toString('utf-8')))

			if (!result.success) {
				console.warn('Failed to parse log data', result.issues)
				return
			}

			const origin = result.output.logGroup.split('/').pop()!

			// Without the version the maps of another deploy could
			// mislabel every frame, so mapping just skips.
			const version = result.output.logStream?.match(/\[([^\]]+)\]/)?.[1]

			for (const logEvent of result.output.logEvents) {
				const error = parseError(logEvent.message, origin)

				if (!error) {
					continue
				}

				// Map the minified stack & message back to the original
				// source. Strictly best-effort & time-boxed: any failure
				// or slow fetch delivers the raw error unchanged.
				if (error.stackTrace?.length && version) {
					try {
						const mapper = await getSymbolicator()

						if (mapper) {
							const mapped = await Promise.race([
								mapper({
									functionName: origin,
									version,
									type: error.type,
									message: error.message,
									stackTrace: error.stackTrace,
								}),
								new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 3_000)),
							])

							if (mapped) {
								// An unchanged stack means pure passthrough - the
								// header then carries no better information.
								const didMap = mapped.stackTrace !== error.stackTrace

								error.message = mapped.message
								error.stackTrace = mapped.stackTrace

								// Old runtimes log the wrapper's minified class as
								// the type while the stack header keeps the real
								// one - but a plausible type never gets replaced.
								const header = mapped.stackTrace?.[0]?.match(/^([A-Z][\w$]*Error): /)

								if (didMap && header && !error.type.endsWith('Error')) {
									error.type = header[1]!
								}
							}
						}
					} catch {}
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
					// Logging here is loop-safe, since this log group is never subscribed.
					.catch(error => console.error('The on-error-log consumer failed', error))

				const deadline = Math.max(0, context.getRemainingTimeInMillis() - 3_000)

				await Promise.race([invoke, new Promise(resolve => setTimeout(resolve, deadline))])
			}
		} catch (error) {
			console.warn('Failed to consume the error logs', error)
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

		// The error's own name property duplicates errorType.
		delete (extra as Record<string, unknown>).name

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
