import { AsyncLocalStorage } from 'node:async_hooks'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { kebabCase } from 'change-case'

// ------------------------------------------------------------
// The bundle lambda.
//
// Every function in the app is deployed into one shared "bundle"
// lambda. A route key like "stack:function:name" identifies one
// handler inside the bundle, and every invoke payload carries the
// route key so the bundle knows which handler should run.

// The payload property used to route lambda invokes to the right bundle handler.
export const ROUTE_PROPERTY = '$awsless-route'

// The request header used to route web requests to the right bundle handler.
export const ROUTE_HEADER = 'x-awsless-route'

// The alias that every deploy promotes; matches the CLI's LIVE_LAMBDA_ALIAS.
export const LIVE_BUNDLE_ALIAS = 'live'

// The app env is read at call time, since the CLI sets it after import.
export const getBundleName = () => `${kebabCase(process.env.APP!)}--function--bundle`

export const formatRouteKey = (stackName: string, resourceType: string, resourceName: string) => {
	return [stackName, resourceType, resourceName].map(v => kebabCase(v)).join(':')
}

export const formatRoutePayload = (routeKey: string, event: unknown) => {
	return {
		[ROUTE_PROPERTY]: routeKey,
		event,
	}
}

// ------------------------------------------------------------
// The deployment context of an invocation.
//
// The qualifier a lambda is invoked with names the deployment it
// serves: either an immutable deployment id alias or the mutable
// live alias. Internal calls pass the qualifier along, so a whole
// call chain stays inside one deployment.

let invokedQualifier: string | undefined

export const captureInvokedQualifier = (context: { invokedFunctionArn?: string }) => {
	// arn:aws:lambda:region:account:function:name[:qualifier]
	invokedQualifier = context.invokedFunctionArn?.split(':')[7]
}

export const getInvokedQualifier = () => {
	return invokedQualifier
}

// ------------------------------------------------------------
// Invoking the bundle from the outside.

type InvokeBundleProps = Omit<InvokeOptions, 'name' | 'payload'> & {
	routeKey: string
	payload?: unknown
}

// Invoke the bundle lambda & let it dispatch to the route handler.
// The call carries the qualifier we were invoked with ourselves, so
// one deployment never calls into code of another. Callers outside
// of a lambda call the latest promoted deployment.
export const invokeBundle = ({ routeKey, payload, ...options }: InvokeBundleProps) => {
	// Inside a sandbox every bundle call goes to the sandbox proxy,
	// the only lambda a sandboxed function is allowed to invoke. The
	// proxy forwards the allowlisted routes to the bundle.
	const proxy = process.env.SANDBOX_PROXY

	if (proxy) {
		return invoke({
			...options,
			name: proxy,
			qualifier: options.qualifier ?? getInvokedQualifier() ?? LIVE_BUNDLE_ALIAS,
			payload: formatRoutePayload(routeKey, payload),
		})
	}

	return invoke({
		...options,
		name: getBundleName(),
		qualifier: options.qualifier ?? getInvokedQualifier() ?? LIVE_BUNDLE_ALIAS,
		payload: formatRoutePayload(routeKey, payload),
	})
}

// ------------------------------------------------------------
// Invoking inside the bundle.
//
// While the bundle runs a route handler, we track which route is
// executing, together with a dispatcher provided by the bundle
// runtime that can run other route handlers in the same process.

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

// True when the current code is running as a route handler inside the bundle lambda.
export const isInsideBundle = () => bundleContext.getStore() !== undefined

export const getCurrentRoute = () => bundleContext.getStore()?.routeKey

// Decided per route at invoke time: concurrent requests in one process
// (the local dev worker) each carry their own flag instead of sharing a
// global. Outside the bundle nothing enables it.
export const shouldThrowExpectedErrors = () => bundleContext.getStore()?.throwExpectedErrors ?? false

// The bundle runtime wraps every route handler in this context.
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

// Run another route handler in the same process, instead of paying
// for a lambda invoke of the bundle we are already running in.
export const internalInvoke = (routeKey: string, payload: unknown) => {
	const context = bundleContext.getStore()

	if (!context) {
		throw new Error('Internal invocations are only available inside the bundle')
	}

	return context.internalInvoke(routeKey, payload)
}

// ------------------------------------------------------------
// The bundle's own route table, registered by the bundle runtime.
// A function route that isn't in the table is served by its own
// stand-alone lambda, whose name derives from the route key.

let bundleRoutes: string[] = []

export const setBundleRoutes = (routes: string[]) => {
	bundleRoutes = routes
}

export const hasBundleRoute = (routeKey: string) => {
	return bundleRoutes.includes(routeKey)
}

export const getStandaloneFunctionName = (routeKey: string) => {
	const [stackName, , functionName] = routeKey.split(':')

	return `${kebabCase(process.env.APP!)}--${stackName}--function--${functionName}`
}

// ------------------------------------------------------------
// Env vars are scoped per route key inside the shared bundle env.

export const formatRouteEnvName = (routeKey: string, name: string) => {
	return `${routeKey}:${name}`
}

export const getRouteEnv = (name: string) => {
	const routeKey = getCurrentRoute() ?? process.env.AWSLESS_ROUTE

	return process.env[routeKey ? formatRouteEnvName(routeKey, name) : name]
}
