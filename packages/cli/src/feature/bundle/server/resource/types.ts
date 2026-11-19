import type { LambdaFunctionURLEvent } from 'aws-lambda'
import { ROUTE_PROPERTY } from 'awsless'

export type BundleEvent = {
	[ROUTE_PROPERTY]?: string
	event?: unknown
	headers?: LambdaFunctionURLEvent['headers']
}

// What a route's span tells about its trigger: counts, names, ages and
// retries, never a payload, a url or an item's keys, which can hold personal
// data. Annotations are few (X-Ray indexes 50 per trace); the rest is metadata.
export type RouteSpan = {
	// What invoked the route, like "sqs", "http" or "schedule".
	trigger: string
	annotations?: Record<string, string | number | boolean>
	metadata?: Record<string, string | number | boolean>
	http?: { method?: string }
}

export type RouteMatch = {
	key: string
	payload: unknown
	// The trigger's details for the route's span, read only when the invocation is traced.
	describeSpan?: () => RouteSpan
	// Async routes throw expected errors, so the invocation fails & retries.
	throwExpectedErrors?: boolean
}

export type RouteMatcher<Event extends object = object> = (
	event: BundleEvent & Partial<Event>,
	routes: string[]
) => RouteMatch | RouteMatch[] | undefined
