import { invoke, InvokeOptions } from '@awsless/lambda'
import { kebabCase } from 'change-case'
import { AsyncLocalStorage } from 'node:async_hooks'

// ------------------------------------------------------------
// The bundle lambda.
//
// Every function in the app is deployed into one shared "bundle"
// lambda. A route key like "stack:function:name" identifies one
// handler inside the bundle, and every invoke payload carries the
// route key so the bundle knows which handler should run.

// The payload property used to route lambda invokes to the right bundle handler.
export const ROUTE_PROPERTY = '$awsless-route'

// The alias that every deploy promotes; matches the CLI's LIVE_LAMBDA_ALIAS.
export const LIVE_BUNDLE_ALIAS = 'live'

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
// Invoking the bundle from the outside.

type InvokeBundleProps = Omit<InvokeOptions, 'name' | 'payload'> & {
	routeKey: string
	payload?: unknown
}

// Invoke the bundle lambda & let it dispatch to the route handler.
// Inside the bundle we call the exact version we are running ourselves,
// so one deployment never calls into code of another. Stand-alone
// lambdas run unversioned & call the latest promoted deployment, like
// every caller outside of a lambda.
export const invokeBundle = ({ routeKey, payload, ...options }: InvokeBundleProps) => {
	// Inside a sandbox every bundle call goes to the sandbox proxy,
	// the only lambda a sandboxed function is allowed to invoke. The
	// proxy forwards the allowlisted routes to the live bundle.
	const proxy = process.env.SANDBOX_PROXY

	if (proxy) {
		return invoke({
			...options,
			name: proxy,
			payload: formatRoutePayload(routeKey, payload),
		})
	}

	const version = process.env.STANDALONE === 'true' ? undefined : process.env.AWS_LAMBDA_FUNCTION_VERSION

	return invoke({
		...options,
		name: getBundleName(),
		qualifier: options.qualifier ?? version ?? LIVE_BUNDLE_ALIAS,
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
}

const bundleContext = new AsyncLocalStorage<BundleContext>()

// True when the current code is running as a route handler inside the bundle lambda.
export const isInsideBundle = () => bundleContext.getStore() !== undefined

export const getCurrentRoute = () => bundleContext.getStore()?.routeKey

// The bundle runtime wraps every route handler in this context.
export const withBundleRouteContext = <T>(routeKey: string, internalInvoke: InternalInvoke, callback: () => T) => {
	return bundleContext.run({ routeKey, internalInvoke }, callback)
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
// Env vars are scoped per route key inside the shared bundle env.

export const formatRouteEnvName = (routeKey: string, name: string) => {
	return `${routeKey}:${name}`
}

// True when the route is served by its own stand-alone lambda instead
// of the bundle. Stand-alone functions are invoked directly by name.
export const isStandaloneRoute = (routeKey: string) => {
	return process.env[formatRouteEnvName(routeKey, 'STANDALONE')] === 'true'
}

export const getRouteEnv = (name: string) => {
	const routeKey = getCurrentRoute() ?? process.env.AWSLESS_ROUTE

	return process.env[routeKey ? formatRouteEnvName(routeKey, name) : name]
}
