// Spans for the app's own steps, shown in X-Ray under the route that runs them when the app has tracing on.
export {
	flushTraces,
	isTracing,
	runTraceStep,
	startSpan,
	trace,
	withTraceHeader,
	type Span,
	type SpanEnd,
	type SpanOptions,
	type TraceAnnotations,
	type TraceOptions,
} from '@awsless/utils'
