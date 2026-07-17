import type { LambdaFunctionURLEvent } from 'aws-lambda'

export type BundleEvent = {
	'$awsless-route'?: string
	event?: unknown
	headers?: LambdaFunctionURLEvent['headers']
}

export type RouteMatch = {
	key: string
	payload: unknown
}

export type RouteMatcher<Event extends object = object> = (
	event: BundleEvent & Partial<Event>,
	routes: string[]
) => RouteMatch | RouteMatch[] | undefined
