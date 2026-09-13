import { AsyncLocalStorage } from 'node:async_hooks'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { kebabCase } from 'change-case'
import { formatResourceName } from './util.js'

// Every function of the app deploys into one shared bundle lambda. A
// route key like "stack:function:name" picks the handler inside it.

// The payload property that routes lambda invokes to a bundle handler.
export const ROUTE_PROPERTY = '$awsless-route'

// The request header that routes web requests to a bundle handler.
export const ROUTE_HEADER = 'x-awsless-route'

// The alias every deploy promotes.
export const LIVE_BUNDLE_ALIAS = 'live'

export const getBundleName = () => {
	return formatResourceName({ resourceType: 'function', resourceName: 'bundle' })
}

export const formatRouteKey = (stackName: string, resourceType: string, resourceName: string) => {
	return [stackName, resourceType, resourceName].map(v => kebabCase(v)).join(':')
}

export const formatRoutePayload = (routeKey: string, event: unknown) => {
	return {
		[ROUTE_PROPERTY]: routeKey,
		event,
	}
}

// The qualifier we were invoked with names the deployment we serve.
// Internal calls pass it along, so a call chain stays in one deployment.
let invokedQualifier: string | undefined

export const captureInvokedQualifier = (context: { invokedFunctionArn?: string }) => {
	// arn:aws:lambda:region:account:function:name[:qualifier]
	invokedQualifier = context.invokedFunctionArn?.split(':')[7]
}

export const getInvokedQualifier = () => {
	return invokedQualifier
}

type InvokeBundleProps = Omit<InvokeOptions, 'name' | 'payload'> & {
	routeKey: string
	payload?: unknown
}

// Callers outside of a lambda have no qualifier & get the promoted deployment.
export const invokeBundle = ({ routeKey, payload, ...options }: InvokeBundleProps) => {
	// A sandboxed function may only invoke its proxy, which forwards
	// the allowlisted routes to the bundle.
	const proxy = process.env.SANDBOX_PROXY

	return invoke({
		...options,
		name: proxy || getBundleName(),
		qualifier: options.qualifier ?? getInvokedQualifier() ?? LIVE_BUNDLE_ALIAS,
		payload: formatRoutePayload(routeKey, payload),
	})
}

// While the bundle runs a route handler, the active route key & a
// dispatcher for other routes in the same process ride on this context.

export type InternalInvoke = (routeKey: string, payload: unknown) => Promise<unknown>

type BundleContext = {
	routeKey: string
	internalInvoke: InternalInvoke
	throwExpectedErrors: boolean
}

export type BundleRouteOptions = {
	// Async routes (queue, topic, table, ...) throw expected errors so
	// the invocation fails & retries, while sync routes respond with them.
	throwExpectedErrors?: boolean
}

const bundleContext = new AsyncLocalStorage<BundleContext>()

export const isInsideBundle = () => bundleContext.getStore() !== undefined

export const getCurrentRoute = () => bundleContext.getStore()?.routeKey

// Per route instead of a global flag, since the local dev worker runs
// concurrent routes in one process.
export const shouldThrowExpectedErrors = () => bundleContext.getStore()?.throwExpectedErrors ?? false

export const withBundleRouteContext = <T>(
	routeKey: string,
	internalInvoke: InternalInvoke,
	callback: () => T,
	options: BundleRouteOptions = {}
) => {
	return bundleContext.run(
		{ routeKey, internalInvoke, throwExpectedErrors: options.throwExpectedErrors ?? false },
		callback
	)
}

// Run another route handler in-process instead of paying for a lambda
// invoke of the bundle we already run in.
export const internalInvoke = (routeKey: string, payload: unknown) => {
	const context = bundleContext.getStore()

	if (!context) {
		throw new Error('Internal invocations are only available inside the bundle')
	}

	return context.internalInvoke(routeKey, payload)
}

// The bundle's route table. A function route outside it is served by
// its own stand-alone lambda.
let bundleRoutes: string[] = []

export const setBundleRoutes = (routes: string[]) => {
	bundleRoutes = routes
}

export const hasBundleRoute = (routeKey: string) => {
	return bundleRoutes.includes(routeKey)
}

export const getStandaloneFunctionName = (routeKey: string) => {
	const [stackName, , functionName] = routeKey.split(':')

	return formatResourceName({ stackName, resourceType: 'function', resourceName: functionName! })
}

// Env vars are scoped per route key inside the shared bundle env.
export const formatRouteEnvName = (routeKey: string, name: string) => {
	return `${routeKey}:${name}`
}

export const getRouteEnv = (name: string) => {
	const routeKey = getCurrentRoute()

	return process.env[routeKey ? formatRouteEnvName(routeKey, name) : name]
}
