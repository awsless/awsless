export { globalClient } from './client'
export { getVitest, mockObjectValues, mockFn, mockTraceDaemon, nextTick, TRACE_PARENT, TRACE_ROOT } from './mock'
export {
	addTraceMiddleware,
	flushTraces,
	isTracing,
	parseTraceHeader,
	runTraceStep,
	startSpan,
	trace,
	withTraceHeader,
	type Span,
	type SpanEnd,
	type SpanOptions,
	type TraceAnnotations,
	type TraceOptions,
} from './trace'
