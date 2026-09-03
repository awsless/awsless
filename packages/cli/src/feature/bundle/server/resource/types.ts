import type { LambdaFunctionURLEvent } from 'aws-lambda'
import { ROUTE_PROPERTY } from 'awsless'

export type BundleEvent = {
	[ROUTE_PROPERTY]?: string
	event?: unknown
	headers?: LambdaFunctionURLEvent['headers']
}

export type RouteMatch = {
	key: string
	payload: unknown
	// Async routes throw expected errors, so the invocation fails & retries.
	throwExpectedErrors?: boolean
}

export type RouteMatcher<Event extends object = object> = (
	event: BundleEvent & Partial<Event>,
	routes: string[]
) => RouteMatch | RouteMatch[] | undefined
