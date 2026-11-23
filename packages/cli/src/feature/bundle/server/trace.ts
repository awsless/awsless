import { ExpectedError, isErrorResponse, type LambdaContext } from '@awsless/lambda'
import type { SpanEnd, TraceOptions } from 'awsless'
import type { RouteMatch } from './resource/types.js'
import { routeType } from './resource/util.js'

// A route's span: the trigger's details come from the route's own resource
// (`describeSpan` on its match, resource/*.ts); here the invocation's facts
// and how the route's answer or error ends the span.

type Metadata = Record<string, string | number | boolean>

export type RouteCall = {
	// Called by another route in the same process, rather than by Lambda.
	isInternal: boolean
	// The first invocation of this process.
	isColdStart: boolean
	context: LambdaContext
}

// The invocation's own facts, on the outermost span only.
const describeInvocation = (call: RouteCall): Metadata => {
	if (call.isInternal) {
		return {}
	}

	const { context } = call
	const version = context.invokedFunctionArn?.split(':')[7]

	return {
		...(context.awsRequestId ? { request_id: context.awsRequestId } : {}),
		...(version ? { qualifier: version } : {}),
		...(context.memoryLimitInMB ? { memory_mb: Number(context.memoryLimitInMB) } : {}),
		...(typeof context.getRemainingTimeInMillis === 'function'
			? { remaining_ms: context.getRemainingTimeInMillis() }
			: {}),
	}
}

const describeResult = (result: unknown): SpanEnd => {
	if (isErrorResponse(result)) {
		return { error: true, errorType: result.__error__.type }
	}

	// A queue route's partial batch answer: the messages that go back on the queue.
	const failures = (result as { batchItemFailures?: unknown } | undefined)?.batchItemFailures

	if (Array.isArray(failures) && failures.length) {
		return { error: true, errorType: 'batch-item-failures', metadata: { failed_messages: failures.length } }
	}

	const status = (result as { statusCode?: unknown } | undefined)?.statusCode

	if (typeof status === 'number') {
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

	return {}
}

// An expected error is the caller's (an error), anything else ours (a fault).
const describeError = (error: unknown): SpanEnd => {
	if (error instanceof ExpectedError) {
		return { error: true, errorType: error.type }
	}

	return { fault: true, errorType: error instanceof Error ? error.name : 'Error' }
}

export const describeRoute = (match: RouteMatch, call: RouteCall): TraceOptions<unknown> => {
	// An in-process call has no trigger of its own: its caller's span is its parent.
	const span = call.isInternal ? { trigger: 'internal' } : (match.describeSpan?.() ?? { trigger: 'unknown' })
	const metadata = { ...describeInvocation(call), ...span.metadata }

	return {
		annotations: {
			route: match.key,
			route_type: routeType(match.key) ?? 'unknown',
			trigger: span.trigger,
			...(call.isInternal ? {} : { cold_start: call.isColdStart }),
			...span.annotations,
		},
		...(Object.keys(metadata).length ? { metadata } : {}),
		...(span.http ? { http: span.http } : {}),
		endWith: describeResult,
		endWithError: describeError,
	}
}
