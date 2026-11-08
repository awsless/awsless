import { AsyncLocalStorage } from 'node:async_hooks'
import { randomBytes } from 'node:crypto'
import { createSocket, type Socket } from 'node:dgram'
import { subscribe } from 'node:diagnostics_channel'

// Spans as X-Ray subsegments, sent to the X-Ray daemon a Lambda with active
// tracing runs next to the handler. Only when the app turned tracing on
// (AWSLESS_TRACING) and Lambda sampled the invocation; a no-op anywhere else.
// Tracing never fails a call: a step that throws drops its span and logs why.

export type TraceAnnotations = Record<string, string | number | boolean>

export type SpanOptions = {
	// "aws" for an AWS service call, "remote" for another service (ClickHouse, Redis).
	namespace?: 'aws' | 'remote'
	// Indexed by X-Ray for search. Never a secret or personal value.
	annotations?: TraceAnnotations
	// Shown on the span, not indexed. Never a secret or personal value.
	metadata?: Record<string, string | number | boolean>
	// The AWS call's details, like { operation: 'Query', table_name: 'users' }.
	aws?: Record<string, string | number>
	// A web request's method; never its url, which can hold ids and emails.
	http?: { method?: string }
}

export type SpanEnd = {
	// A client error (4xx, an expected error).
	error?: boolean
	// A server error or a crash.
	fault?: boolean
	// Refused for a rate limit (a 429, a throttling error), an error too.
	throttle?: boolean
	// The error's class name, never its message.
	errorType?: string
	aws?: Record<string, string | number>
	// The answer's status code.
	http?: { status?: number }
	metadata?: Record<string, string | number | boolean>
}

export type Span = {
	id: string
	// The trace header for a downstream call, with this span as its parent.
	header: string
	end(result?: SpanEnd): void
}

type TraceHeader = {
	root: string
	parent?: string
	sampled: boolean
	fields: string[]
}

// The invocation's trace header (read from its context, since Lambda Managed
// Instances have no _X_AMZN_TRACE_ID) and the span the code runs in.
type TraceContext = {
	header?: string
	spanId?: string
}

type TraceState = {
	storage: AsyncLocalStorage<TraceContext>
	pending: Set<Promise<void>>
	socket?: Socket
	hasLoggedFailure?: boolean
	// fetch's spans by their undici request, so concurrent requests end their own.
	fetchSpans: WeakMap<object, Span>
	isFetchTraced?: boolean
}

// One state per process, shared by every copy of this package in a bundle,
// so a span opened by one package parents the spans of another.
const STATE_KEY = Symbol.for('awsless.trace')
const globalState = globalThis as typeof globalThis & { [STATE_KEY]?: TraceState }

const getState = () => {
	globalState[STATE_KEY] ??= {
		storage: new AsyncLocalStorage<TraceContext>(),
		pending: new Set(),
		fetchSpans: new WeakMap(),
	}

	return globalState[STATE_KEY]
}

// Logs a tracing failure once per process, so a broken daemon address can't flood the logs.
const logTraceFailure = (error: unknown) => {
	const state = getState()

	if (state.hasLoggedFailure) {
		return
	}

	state.hasLoggedFailure = true
	console.warn('Tracing failed, spans are dropped:', error)
}

// For tests: the next failure is logged again.
export const resetTraceFailureLog = () => {
	getState().hasLoggedFailure = false
}

// Runs a tracing step, answering the fallback when it throws.
export const runTraceStep = <T>(fallback: T, callback: () => T): T => {
	try {
		return callback()
	} catch (error) {
		logTraceFailure(error)
		return fallback
	}
}

// Root=1-5759e988-bd862e3fe1be46a994272793;Parent=53995c3f42cd8ad8;Sampled=1;Lineage=…
export const parseTraceHeader = (header?: string): TraceHeader | undefined => {
	if (!header) {
		return
	}

	const fields = header.split(';').map(field => field.trim())
	const value = (key: string) => fields.find(field => field.startsWith(`${key}=`))?.slice(key.length + 1)
	const root = value('Root')

	if (!root) {
		return
	}

	return { root, parent: value('Parent'), sampled: value('Sampled') === '1', fields }
}

// AWS_XRAY_DAEMON_ADDRESS is "host:port", or "tcp:host:port udp:host:port".
const parseDaemonAddress = (address: string) => {
	const udp = address.split(' ').find(part => part.startsWith('udp:')) ?? address
	const [host, port] = udp.replace(/^udp:/, '').split(':')

	return { host: host!, port: Number(port) }
}

const getTraceHeader = () => {
	if (process.env.AWSLESS_TRACING !== 'true' || !process.env.AWS_XRAY_DAEMON_ADDRESS) {
		return
	}

	const header = parseTraceHeader(getState().storage.getStore()?.header ?? process.env._X_AMZN_TRACE_ID)

	return header?.sampled ? header : undefined
}

// Runs one invocation with its own trace header, so work it leaves running
// can't take the next invocation's. A handler called inside another (an
// in-process call) keeps the outer invocation's context. The first
// invocation of an app with tracing on starts fetch's spans.
export const withTraceHeader = <T>(header: string | undefined, callback: () => T): T => {
	const state = getState()

	if (state.storage.getStore()) {
		return callback()
	}

	if (process.env.AWSLESS_TRACING === 'true') {
		traceFetch()
	}

	return state.storage.run({ header }, callback)
}

export const isTracing = () => runTraceStep(false, () => !!getTraceHeader())

const createSpanId = () => randomBytes(8).toString('hex')

// X-Ray allows letters, digits, whitespace and _ . : / % & # = + \ - @ in a name, at most 200 characters.
const formatSpanName = (name: string) => name.replace(/[^\p{L}\p{N}\s_.:/%&#=+\\\-@]/gu, '_').slice(0, 200)

// An annotation key holds letters, digits and underscores only.
const formatAnnotations = (annotations: TraceAnnotations) => {
	return Object.fromEntries(Object.entries(annotations).map(([key, value]) => [key.replace(/\W/g, '_'), value]))
}

// The header's other fields stay, Lineage included, which Lambda's recursive loop detection reads.
const formatChildHeader = (header: TraceHeader, parent: string) => {
	const rest = header.fields.filter(field => !field.startsWith('Root=') && !field.startsWith('Parent='))

	return [`Root=${header.root}`, `Parent=${parent}`, ...rest].join(';')
}

const getSocket = (state: TraceState) => {
	if (!state.socket) {
		const socket = createSocket('udp4')
		// An unhandled socket error would crash the process.
		socket.on('error', logTraceFailure)
		// The socket never keeps a process alive.
		socket.unref()
		state.socket = socket
	}

	return state.socket
}

const sendSegment = (segment: Record<string, unknown>) => {
	runTraceStep(undefined, () => {
		const state = getState()
		const { host, port } = parseDaemonAddress(process.env.AWS_XRAY_DAEMON_ADDRESS!)
		const message = `{"format":"json","version":1}\n${JSON.stringify(segment)}`
		const socket = getSocket(state)
		const sending = new Promise<void>(resolve => {
			try {
				socket.send(message, port, host, error => {
					if (error) {
						logTraceFailure(error)
					}

					resolve()
				})
			} catch (error) {
				// A bad port or a closed socket throws before the send.
				logTraceFailure(error)
				resolve()
			}
		})

		state.pending.add(sending)
		void sending.then(() => state.pending.delete(sending))
	})
}

const NOOP_SPAN: Span = { id: '', header: '', end() {} }

// A span under the current one (or the Lambda invocation's own segment), ended by the caller.
export const startSpan = (name: string, options: SpanOptions = {}): Span => {
	return runTraceStep(NOOP_SPAN, () => openSpan(name, options))
}

const openSpan = (name: string, options: SpanOptions): Span => {
	const header = getTraceHeader()

	if (!header) {
		return NOOP_SPAN
	}

	const id = createSpanId()
	const parent = getState().storage.getStore()?.spanId ?? header.parent
	const startTime = Date.now() / 1000
	let hasEnded = false

	return {
		id,
		header: formatChildHeader(header, id),
		end(result = {}) {
			if (hasEnded) {
				return
			}

			hasEnded = true

			runTraceStep(undefined, () =>
				sendSegment({
					type: 'subsegment',
					id,
					name: formatSpanName(name),
					trace_id: header.root,
					parent_id: parent,
					start_time: startTime,
					end_time: Date.now() / 1000,
					...(options.namespace ? { namespace: options.namespace } : {}),
					...(options.annotations ? { annotations: formatAnnotations(options.annotations) } : {}),
					...(options.metadata || result.metadata
						? { metadata: { default: { ...options.metadata, ...result.metadata } } }
						: {}),
					...(options.http || result.http
						? {
								http: {
									...(options.http?.method ? { request: { method: options.http.method } } : {}),
									...(result.http?.status ? { response: { status: result.http.status } } : {}),
								},
							}
						: {}),
					...(options.aws || result.aws ? { aws: { ...options.aws, ...result.aws } } : {}),
					...(result.error || result.throttle ? { error: true } : {}),
					...(result.throttle ? { throttle: true } : {}),
					...(result.fault ? { fault: true } : {}),
					...(result.errorType
						? { cause: { exceptions: [{ id: createSpanId(), type: result.errorType }] } }
						: {}),
				})
			)
		},
	}
}

export type TraceOptions<T> = SpanOptions & {
	// How a result ends the span, like an error response marking it an error.
	endWith?: (result: Awaited<T>) => SpanEnd
	// How a thrown error ends the span; a fault by default.
	endWithError?: (error: unknown) => SpanEnd
}

const endWithFault = (error: unknown): SpanEnd => ({
	fault: true,
	errorType: error instanceof Error ? error.name : typeof error,
})

// Runs the callback inside a span, so the spans it opens nest under it.
export const trace = async <T>(
	name: string,
	callback: (span: Span) => T | Promise<T>,
	options: TraceOptions<T> = {}
): Promise<Awaited<T>> => {
	const span = startSpan(name, options)

	if (span === NOOP_SPAN) {
		return await callback(span)
	}

	const context = { header: getState().storage.getStore()?.header, spanId: span.id }
	let result: Awaited<T>

	try {
		result = await getState().storage.run(context, async () => await callback(span))
	} catch (error) {
		span.end(runTraceStep(endWithFault(error), () => (options.endWithError ?? endWithFault)(error)))

		throw error
	}

	// A describer that throws ends the span plain and never touches the result.
	span.end(runTraceStep({}, () => options.endWith?.(result) ?? {}))

	return result
}

// Waits for the spans still being sent, before Lambda freezes the process.
export const flushTraces = async () => {
	await runTraceStep(Promise.resolve(), async () => {
		await Promise.all(getState().pending)
	})
}

type MiddlewareStack = {
	add(middleware: unknown, options: { step: string; priority?: string; name: string; override?: boolean }): void
}

type SdkContext = { clientName?: string; commandName?: string }
type SdkArgs = { input?: Record<string, unknown>; request?: { headers?: Record<string, string> } }
type SdkOutput = { output?: { $metadata?: { requestId?: string; attempts?: number } } }
type SdkError = { name?: string; $metadata?: { httpStatusCode?: number; requestId?: string; attempts?: number } }

const THROTTLE_ERROR = /Throttl|TooManyRequests|ProvisionedThroughputExceeded|RequestLimitExceeded|SlowDown/

const getSdkSpanAws = (metadata: { requestId?: string; attempts?: number } | undefined) => ({
	...(metadata?.requestId ? { request_id: metadata.requestId } : {}),
	...(metadata?.attempts ? { retries: metadata.attempts - 1 } : {}),
})

const startSdkSpan = (context: SdkContext, args: SdkArgs) => {
	const service = context.clientName?.replace(/Client$/, '') ?? 'AWS'
	const operation = context.commandName?.replace(/Command$/, '') ?? 'unknown'
	const tableName = typeof args.input?.TableName === 'string' ? args.input.TableName : undefined
	const functionName = typeof args.input?.FunctionName === 'string' ? args.input.FunctionName : undefined
	const span = startSpan(service, {
		namespace: 'aws',
		aws: {
			operation,
			...(tableName ? { table_name: tableName } : {}),
			...(functionName ? { function_name: functionName } : {}),
		},
	})

	if (span !== NOOP_SPAN && args.request?.headers) {
		args.request.headers['x-amzn-trace-id'] = span.header
	}

	return span
}

const describeSdkError = (error: unknown): SpanEnd => {
	const metadata = (error as SdkError | undefined)?.$metadata
	const status = metadata?.httpStatusCode ?? 500
	const errorType = (error as SdkError | undefined)?.name ?? 'Error'
	// DynamoDB and most services answer a throttle with a 400, so its name tells.
	const isThrottle = status === 429 || THROTTLE_ERROR.test(errorType)

	return {
		error: status < 500 && !isThrottle,
		fault: status >= 500,
		throttle: isThrottle,
		errorType,
		aws: getSdkSpanAws(metadata),
	}
}

// A span per AWS SDK call, retries included, with the downstream trace
// header pointing at it. It runs before the SDK's own recursion detection,
// which leaves a header that's already there.
export const addTraceMiddleware = (client: unknown) => {
	runTraceStep(undefined, () => {
		const stack = (client as { middlewareStack?: MiddlewareStack } | undefined)?.middlewareStack

		if (!stack?.add) {
			return
		}

		stack.add(
			(next: (args: SdkArgs) => Promise<SdkOutput>, context: SdkContext) => async (args: SdkArgs) => {
				if (!isTracing()) {
					return next(args)
				}

				const span = runTraceStep(NOOP_SPAN, () => startSdkSpan(context, args))
				let result: SdkOutput

				try {
					result = await next(args)
				} catch (error) {
					span.end(runTraceStep({ fault: true }, () => describeSdkError(error)))

					throw error
				}

				span.end(runTraceStep<SpanEnd>({}, () => ({ aws: getSdkSpanAws(result?.output?.$metadata) })))

				return result
			},
			{ step: 'build', priority: 'high', name: 'awslessTraceMiddleware', override: true }
		)
	})
}

type UndiciRequest = { origin?: unknown; method?: string }
type UndiciMessage = { request?: UndiciRequest; response?: { statusCode?: number }; error?: unknown }

// The host alone: a url's path and query can hold ids, emails and tokens.
const getRequestHost = (origin: unknown) => {
	return new URL(String(origin)).hostname
}

const startFetchSpan = (message: UndiciMessage) => {
	const { request } = message

	// A CONNECT is a proxy's tunnel, not a request of the app.
	if (!request || request.method === 'CONNECT' || !isTracing()) {
		return
	}

	const span = startSpan(getRequestHost(request.origin), {
		namespace: 'remote',
		http: { method: request.method },
	})

	if (span !== NOOP_SPAN) {
		getState().fetchSpans.set(request, span)
	}
}

const endFetchSpan = (request: UndiciRequest | undefined, result: SpanEnd) => {
	const spans = getState().fetchSpans
	const span = request && spans.get(request)

	if (span) {
		spans.delete(request)
		span.end(result)
	}
}

// Ends at the answer's headers, so a streamed body doesn't keep the span open.
const describeFetchAnswer = (status: number | undefined): SpanEnd => {
	if (status === undefined) {
		return {}
	}

	return {
		http: { status },
		...(status === 429
			? { throttle: true }
			: status >= 500
				? { fault: true }
				: status >= 400
					? { error: true }
					: {}),
	}
}

// An abort is the caller's choice (an error), anything else a failed connection (a fault).
const describeFetchError = (error: unknown): SpanEnd => {
	const errorType = error instanceof Error ? error.name : 'Error'

	return errorType === 'AbortError' ? { error: true, errorType } : { fault: true, errorType }
}

// A span per fetch, from undici's diagnostics channels, which Node's fetch
// publishes in the caller's async context; subscribed once, by the first
// invocation with tracing on (withTraceHeader). No trace header is added: the
// hosts are third parties, which have no use for it. A subscriber that throws
// would crash the process, so each one is guarded.
const traceFetch = () => {
	const state = getState()

	if (state.isFetchTraced) {
		return
	}

	state.isFetchTraced = true

	runTraceStep(undefined, () => {
		subscribe('undici:request:create', message => {
			runTraceStep(undefined, () => startFetchSpan(message as UndiciMessage))
		})
		subscribe('undici:request:headers', message => {
			runTraceStep(undefined, () => {
				const { request, response } = message as UndiciMessage
				endFetchSpan(request, describeFetchAnswer(response?.statusCode))
			})
		})
		subscribe('undici:request:error', message => {
			runTraceStep(undefined, () => {
				const { request, error } = message as UndiciMessage
				endFetchSpan(request, describeFetchError(error))
			})
		})
	})
}
