import { GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3'
import { s3Client } from '@awsless/s3'
import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda'

// Serves a deployment preview directly from the lambda url of its
// deployment alias, without the router in front. The handler mirrors
// the router function: it matches the request path against the route
// table & either serves the s3 object itself or dispatches the web
// handler in-process.

export type PreviewRoute = {
	type: 'lambda' | 's3'
	domainName?: string
	forwardHost?: boolean
	requestHeaders?: Record<string, string>
	rewrite?: {
		regex?: string
		to: string
	}
}

type PreviewProps = {
	router: string
	routes: Record<string, PreviewRoute>
	basicAuth?: { username: string; password: string }
	passwordAuth?: { password: string }
	dispatch: (event: LambdaFunctionURLEvent) => Promise<unknown>
}

const getPossibleRouteKeys = (path: string) => {
	if (path === '' || path === '/') {
		return ['/', '/*']
	}

	const parts = path.split('/')
	const root = path.startsWith('/') ? parts[1]! : parts[0]!
	const file = parts[parts.length - 1]!.includes('.')

	if (root.includes('.')) {
		return [path, '/*.', '/*']
	}

	if (file) {
		return [path, '/' + root + '/*.', '/' + root + '/*', '/*.', '/*']
	}

	return [path, '/' + root + '/*', '/*']
}

const findRoute = (props: PreviewProps, path: string, method: string) => {
	for (const key of getPossibleRouteKeys(path)) {
		const route = props.routes[`${props.router}:${key}`]

		if (!route) {
			continue
		}

		if (route.type === 's3' && method !== 'GET' && method !== 'HEAD') {
			continue
		}

		return route
	}

	return
}

const rewritePath = (route: PreviewRoute, path: string) => {
	if (!route.rewrite) {
		return path
	}

	if (route.rewrite.regex) {
		return path.replace(new RegExp(route.rewrite.regex), route.rewrite.to)
	}

	return route.rewrite.to
}

const serveObject = async (route: PreviewRoute, path: string, method: string): Promise<LambdaFunctionURLResult> => {
	// site buckets never contain dots, so the name ends at the s3 host suffix
	const bucket = route.domainName!.split('.s3')[0]!
	const key = rewritePath(route, path).replace(/^\//, '')

	let result

	try {
		result = await s3Client().send(
			new GetObjectCommand({
				Bucket: bucket,
				Key: key,
			})
		)
	} catch (error) {
		if (error instanceof NoSuchKey) {
			return {
				statusCode: 404,
			}
		}

		throw error
	}

	const headers: Record<string, string> = {}

	if (result.ContentType) {
		headers['content-type'] = result.ContentType
	}

	if (result.CacheControl) {
		headers['cache-control'] = result.CacheControl
	}

	if (result.ETag) {
		headers['etag'] = result.ETag
	}

	if (method === 'HEAD') {
		return { statusCode: 200, headers }
	}

	return {
		statusCode: 200,
		headers,
		body: await result.Body!.transformToString('base64'),
		isBase64Encoded: true,
	}
}

// The preview enforces the same viewer auth as the router function, since
// the deployment alias url bypasses the router in front.
const checkAuth = (props: PreviewProps, headers: Record<string, string | undefined>) => {
	if (!props.basicAuth && !props.passwordAuth) {
		return
	}

	const authHeader = headers['authorization']
	const authMethods: string[] = []

	if (props.basicAuth) {
		authMethods.push('Basic realm="Protected"')

		const expected = Buffer.from(`${props.basicAuth.username}:${props.basicAuth.password}`).toString('base64')

		if (authHeader?.startsWith('Basic ') && authHeader.slice(6) === expected) {
			return
		}
	}

	if (props.passwordAuth) {
		authMethods.push('Password realm="Protected"')

		if (authHeader?.startsWith('Password ') && authHeader.slice(9) === props.passwordAuth.password) {
			return
		}
	}

	return {
		statusCode: 401,
		headers: {
			'access-control-allow-origin': '*',
			'www-authenticate': authMethods.join(', '),
		},
	} satisfies LambdaFunctionURLResult
}

export const createPreviewHandler = (props: PreviewProps) => {
	return async (event: LambdaFunctionURLEvent): Promise<unknown> => {
		const method = event.requestContext.http.method
		const headers = event.headers ?? {}
		let path = event.rawPath

		try {
			path = decodeURIComponent(path)
		} catch {}

		const unauthorized = checkAuth(props, headers)

		if (unauthorized) {
			return unauthorized
		}

		if (method === 'OPTIONS') {
			return {
				statusCode: 204,
				headers: {
					'access-control-allow-origin': '*',
					'access-control-allow-methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
					'access-control-allow-headers': '*',
					'access-control-max-age': '86400',
				},
			} satisfies LambdaFunctionURLResult
		}

		const route = findRoute(props, path, method)

		if (!route) {
			return {
				statusCode: 404,
			} satisfies LambdaFunctionURLResult
		}

		if (route.type === 's3') {
			return serveObject(route, path, method)
		}

		for (const [name, value] of Object.entries(route.requestHeaders ?? {})) {
			headers[name] = value
		}

		// The router tunnels the viewer authorization in a custom header,
		// so mirror it here & drop any spoofed value.
		if (headers.authorization) {
			headers['x-awsless-authorization'] = headers.authorization
		} else {
			delete headers['x-awsless-authorization']
		}

		if (route.forwardHost && headers.host) {
			headers['x-forwarded-host'] = headers.host
		}

		event.headers = headers
		event.rawPath = rewritePath(route, path)

		return props.dispatch(event)
	}
}
