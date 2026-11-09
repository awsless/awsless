import { AddressInfo } from 'net'
import { findInputDeps, getMeta } from '@terraforge/core'
import { h, isInsideBundle, toFunctionUrlEvent, toWebResponse } from 'awsless'
import { afterEach, describe, expect, it } from 'vitest'
import { createBundle } from '../src/feature/bundle/server/handle'
import { startWebFunctionServer } from '../src/feature/bundle/server/web-function'
import { createTestApp, findStatements, listResources } from './_kit'

const code = { file: { nocheck: './handler.ts' } }

const createWebApp = (props: { app?: object; routers?: object; deploymentId?: string } = {}) => {
	const result = createTestApp({
		deploymentId: props.deploymentId,
		app: {
			domains: { main: { domain: 'example.com' } },
			router: props.routers ?? { main: { domain: 'main' } },
			...props.app,
		},
		stacks: [{ name: 'api', routes: { main: { '/identify': { code }, '/events': { code } } } }],
	})

	result.ready()

	return result
}

const WEB_FUNCTION_RESOURCE_TYPES = [
	'aws_lambdaweb_function',
	'aws_lambdaweb_function_revision',
	'aws_lambdaweb_function_endpoint',
	'aws_lambdaweb_resource_policy',
	'aws_lambdacore_network_connector',
	'web-function-live-revision',
]

describe('router web function', () => {
	it('should make none without a router', () => {
		const result = createTestApp({ app: {} })

		result.ready()

		for (const type of WEB_FUNCTION_RESOURCE_TYPES) {
			expect(listResources(result.app, type)).toHaveLength(0)
		}
	})

	it('should leave the distributions on the placeholder origin the router function replaces', () => {
		const { app } = createWebApp({
			routers: { main: { domain: 'main' }, other: { domain: 'main', subDomain: 'other' } },
		})

		for (const distribution of listResources(app, 'aws_cloudfront_multitenant_distribution')) {
			expect(distribution.input.origin).toHaveLength(1)
			expect(distribution.input.origin[0].domainName).toBe('placeholder.awsless.dev')
		}

		expect(listResources(app, 'aws_cloudfront_origin_access_control')).toEqual([])
	})

	it('should name the endpoint in the route table and wait for its revision & policy', () => {
		const { app } = createWebApp()
		const deployment = listResources(app, 'route-deployment')[0]!
		const endpoint = listResources(app, 'aws_lambdaweb_function_endpoint')[0]!

		expect(findInputDeps(deployment.input.routes)).toContain(endpoint)
		expect(deployment.config?.dependsOn?.map(dependency => getMeta(dependency).type)).toEqual(
			expect.arrayContaining(['aws_lambdaweb_function_revision', 'aws_lambdaweb_resource_policy'])
		)
	})

	it('should run a copy of the bundle with its code & role', () => {
		const { app, shared } = createWebApp()
		const revision = listResources(app, 'aws_lambdaweb_function_revision')[0]!
		const connector = listResources(app, 'aws_lambdacore_network_connector')[0]!
		const eventFunction = listResources(app, 'aws_lambda_function').find(meta => meta.urn.includes('bundle'))!
		const code = listResources(app, 'aws_s3_bucket_object').find(meta => meta.urn.includes(':bundle:{event}:'))!

		const [build] = revision.input.buildConfig
		const [service] = revision.input.serviceConfig

		expect(build.runtimeConfig).toEqual([{ runtime: 'nodejs24.x' }])
		expect(findInputDeps(build.codeConfig)).toEqual([code, code, code])
		expect(findInputDeps(service.executionRoleArn)).toEqual(findInputDeps(eventFunction.input.role))
		expect(findInputDeps(service.egressNetworkConnectorArn)).toEqual([connector])
		expect(service.environmentVariables).toMatchObject({
			APP: 'test-app',
			AWS_LAMBDA_NODEJS_ENTRYPOINT: 'web-function.mjs',
			AWSLESS_WEB_FUNCTION_NAME: 'test-app--bundle--web',
			AWS_USE_DUALSTACK_ENDPOINT: 'true',
		})
		expect(service.environmentVariables.AWSLESS_TRACING).toBeUndefined()
		expect(service.telemetryConfig[0].loggingConfig[0].logGroup).toBe('/aws/lambda/test-app--bundle--web')
		// Kept for Lambda's own cleanup: deleting it fails while it serves.
		expect(revision.config).toMatchObject({ createBeforeReplace: true, retainOnDelete: true })

		const [vpc] = connector.input.configuration[0].vpcEgressConfiguration

		expect(vpc.associatedComputeResourceTypes).toEqual(['WebFunction'])
		expect(vpc.networkProtocol).toBe('DualStack')

		const logs = findStatements(shared, 'logs:PutLogEvents').map(statement => findInputDeps(statement.resources))

		expect(logs.some(deps => deps.some(meta => meta.urn.includes('{web}')))).toBe(true)
	})

	it('should keep the endpoint on the live revision until promotion', () => {
		const { app } = createWebApp({ deploymentId: 'main-7' })
		const endpoint = listResources(app, 'aws_lambdaweb_function_endpoint')[0]!
		const liveRevision = listResources(app, 'web-function-live-revision')[0]!
		const revision = listResources(app, 'aws_lambdaweb_function_revision')[0]!

		expect(endpoint.input).toMatchObject({
			endpointName: 'router',
			endpointType: 'HomeRegion',
			authType: 'IamAuth',
			autoDeploymentMode: 'Disabled',
		})
		expect(findInputDeps(endpoint.input.revisionWeight)).toEqual([liveRevision])
		expect(findInputDeps(liveRevision.input.revisionId)).toEqual([revision])
		// Read again on every deployment.
		expect(liveRevision.input.deploymentId).toBe('main-7')
	})

	it('should only let the distributions call the endpoint', () => {
		const { app } = createWebApp()
		const policy = listResources(app, 'aws_lambdaweb_resource_policy')[0]!
		const endpoint = listResources(app, 'aws_lambdaweb_function_endpoint')[0]!
		const distribution = listResources(app, 'aws_cloudfront_multitenant_distribution')[0]!

		expect(findInputDeps(policy.input.policy)).toEqual(expect.arrayContaining([endpoint, distribution]))
	})
})

describe('web function requests', () => {
	it('should turn a request into the function url event', async () => {
		const event = await toFunctionUrlEvent(
			new Request('https://example.com/identify?a%20b=1%2F2&a%20b=x+y&flag', {
				method: 'POST',
				headers: {
					'x-awsless-route': 'api:route:identify',
					cookie: 'a=1; b=2',
					'content-type': 'application/json; charset=utf-8',
					'x-forwarded-for': '203.0.113.7, 130.176.1.1',
					'cloudfront-viewer-address': '203.0.113.7:51234',
					'lambda-web-request-id': 'req-1',
				},
				body: '{"a":1}',
			}),
			{ sourceIp: '130.176.1.1' }
		)

		expect(event.rawPath).toBe('/identify')
		expect(event.rawQueryString).toBe('a%20b=1%2F2&a%20b=x+y&flag')
		expect(event.queryStringParameters).toEqual({ 'a b': '1/2,x y', flag: '' })
		expect(event.cookies).toEqual(['a=1', 'b=2'])
		expect(event.headers).toMatchObject({
			'x-awsless-route': 'api:route:identify',
			'cloudfront-viewer-address': '203.0.113.7:51234',
		})
		expect(event.requestContext.http).toMatchObject({ method: 'POST', sourceIp: '130.176.1.1' })
		expect(event.body).toBe('{"a":1}')
		expect(event.isBase64Encoded).toBe(false)
	})

	it('should hand a binary body over in base64 & leave out an empty one', async () => {
		const binary = await toFunctionUrlEvent(
			new Request('https://example.com/upload', {
				method: 'PUT',
				headers: { 'content-type': 'application/octet-stream' },
				body: new Uint8Array([0, 1, 2]),
			})
		)

		expect(binary.body).toBe('AAEC')
		expect(binary.isBase64Encoded).toBe(true)

		const empty = await toFunctionUrlEvent(new Request('https://example.com/'))

		expect(empty.body).toBeUndefined()
		expect(empty.isBase64Encoded).toBe(false)
		expect(empty.queryStringParameters).toBeUndefined()
	})

	it('should answer like a function url', async () => {
		const json = toWebResponse({ a: 1 })

		expect(json.status).toBe(200)
		expect(await json.json()).toEqual({ a: 1 })

		const redirect = toWebResponse({
			statusCode: 302,
			headers: { Location: '/next' },
			cookies: ['a=1; Path=/', 'b=2; Path=/'],
			body: 'AAEC',
			isBase64Encoded: true,
		})

		expect(redirect.status).toBe(302)
		expect(redirect.headers.get('location')).toBe('/next')
		expect(redirect.headers.getSetCookie()).toEqual(['a=1; Path=/', 'b=2; Path=/'])
		expect(new Uint8Array(await redirect.arrayBuffer())).toEqual(new Uint8Array([0, 1, 2]))
	})
})

describe('web function server', () => {
	const servers: Array<ReturnType<typeof startWebFunctionServer>> = []

	afterEach(() => {
		for (const server of servers.splice(0)) {
			server.close()
		}

		delete process.env.AWS_LAMBDA_HTTP_ENDPOINT
		delete process.env.AWSLESS_WEB_FUNCTION_TIMEOUT_SECONDS
		delete process.env.AWSLESS_DEPLOYMENT_ID
	})

	// A route that takes web requests: its body back in capitals, a chunk at a time.
	const uppercaseRoute = Object.assign(async () => ({ statusCode: 500 }), {
		fetch: async (request: Request) => {
			const reader = request.body!.getReader()

			return new Response(
				new ReadableStream({
					async pull(controller) {
						const chunk = await reader.read()

						if (chunk.done) {
							controller.close()
						} else {
							controller.enqueue(
								new TextEncoder().encode(new TextDecoder().decode(chunk.value).toUpperCase())
							)
						}
					},
				}),
				{
					headers: {
						'x-route': 'shout',
						'x-authorization': request.headers.get('authorization') ?? '',
						'x-signature-headers': ['x-amz-security-token', 'x-amz-date']
							.filter(name => request.headers.has(name))
							.join(),
					},
				}
			)
		},
	})

	// CloudFront names the viewer on every request, which a route asks for.
	const viewer = { 'cloudfront-viewer-address': '198.51.100.10:1234' }

	// A plain handler, which gets the function url event.
	const echoRoute = async (event: { rawPath: string; cookies?: string[]; body?: string }) => ({
		statusCode: 201,
		cookies: ['a=1', 'b=2'],
		body: JSON.stringify({ path: event.rawPath, cookies: event.cookies, body: event.body }),
	})

	const startServer = async () => {
		process.env.AWS_LAMBDA_HTTP_ENDPOINT = '127.0.0.1:0'
		process.env.AWSLESS_WEB_FUNCTION_TIMEOUT_SECONDS = '30'
		process.env.AWSLESS_DEPLOYMENT_ID = 'main-2'

		const server = startWebFunctionServer(
			createBundle({
				'api:route:shout': async () => uppercaseRoute as never,
				'api:route:echo': async () => echoRoute as never,
				'api:route:endless': async () =>
					h.route(() => new Response(new ReadableStream({ pull: () => new Promise(() => {}) }))) as never,
				'api:route:cached': async () =>
					h.route(() => new Response('x', { headers: { 'cache-control': 'public, max-age=60' } })) as never,
				'api:route:inside': async () =>
					h.route(() => {
						return new Response(
							new ReadableStream({
								async pull(controller) {
									// After a pause, outside the request's own async run.
									await new Promise(resolve => setTimeout(resolve, 20))
									controller.enqueue(new TextEncoder().encode(String(isInsideBundle())))
									controller.close()
								},
							})
						)
					}) as never,
			})
		)

		servers.push(server)

		await new Promise(resolve => server.once('listening', resolve))

		return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
	}

	it('should stream the request & response of a route that takes web requests', async () => {
		const url = await startServer()
		const chunks = ['a', 'b', 'c']
		const firstChunkAnswered = Promise.withResolvers<void>()
		const body = new ReadableStream<Uint8Array>({
			async pull(controller) {
				// The rest of the upload waits for the first chunk's answer.
				if (chunks.length < 3) {
					await firstChunkAnswered.promise
				}

				const chunk = chunks.shift()

				if (chunk) {
					controller.enqueue(new TextEncoder().encode(chunk))
				} else {
					controller.close()
				}
			},
		})

		const response = await fetch(`${url}/shout`, {
			method: 'POST',
			headers: { 'x-awsless-route': 'api:route:shout', 'x-awsless-authorization': 'Bearer viewer' },
			body,
			duplex: 'half',
		} as RequestInit)

		expect(response.headers.get('x-route')).toBe('shout')
		// The router's tunnelled authorization is the viewer's again.
		expect(response.headers.get('x-authorization')).toBe('Bearer viewer')

		const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()

		expect((await reader.read()).value).toBe('A')
		firstChunkAnswered.resolve()

		let rest = ''

		for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
			rest += chunk.value
		}

		expect(rest).toBe('BC')
	})

	it("should never hand a handler CloudFront's own signature as the caller's", async () => {
		const url = await startServer()
		const response = await fetch(`${url}/shout`, {
			method: 'POST',
			headers: {
				'x-awsless-route': 'api:route:shout',
				authorization: 'AWS4-HMAC-SHA256 Credential=edge',
				'x-amz-security-token': 'edge-token',
				'x-amz-date': '20260716T000000Z',
			},
			body: 'a',
		})

		expect(response.headers.get('x-authorization')).toBe('')
		expect(response.headers.get('x-signature-headers')).toBe('')
	})

	it('should hand any other route the function url event', async () => {
		const url = await startServer()
		const response = await fetch(`${url}/echo?x=1`, {
			method: 'POST',
			headers: { 'x-awsless-route': 'api:route:echo', cookie: 'c=3', 'content-type': 'application/json' },
			body: '{"a":1}',
		})

		expect(response.status).toBe(201)
		expect(response.headers.getSetCookie()).toEqual(['a=1', 'b=2'])
		expect(await response.json()).toEqual({ path: '/echo', cookies: ['c=3'], body: '{"a":1}' })
	})

	it("should keep a streamed body's work inside the bundle, so its Fn calls stay in-process", async () => {
		const url = await startServer()
		const response = await fetch(`${url}/inside`, { headers: { 'x-awsless-route': 'api:route:inside', ...viewer } })

		expect(await response.text()).toBe('true')
	})

	it("should never let another deployment's route table cache an answer", async () => {
		const url = await startServer()
		const cached = (deploymentId: string) =>
			fetch(`${url}/cached`, {
				headers: { 'x-awsless-route': 'api:route:cached', 'x-awsless-deployment-id': deploymentId, ...viewer },
			})

		expect((await cached('main-2')).headers.get('cache-control')).toBe('public, max-age=60')
		// The endpoint already serves main-2 while main-1's route table is live.
		expect((await cached('main-1')).headers.get('cache-control')).toBe('no-store')
	})

	it('should answer a HEAD without waiting for the body', async () => {
		const url = await startServer()
		const response = await fetch(`${url}/endless`, {
			method: 'HEAD',
			headers: { 'x-awsless-route': 'api:route:endless', ...viewer },
		})

		expect(response.status).toBe(200)
		expect(await response.text()).toBe('')
	})

	it('should answer a 500 for an unknown route', async () => {
		const url = await startServer()
		const response = await fetch(`${url}/`, { headers: { 'x-awsless-route': 'nope:route:x' } })

		expect(response.status).toBe(500)
		// A route table of a deployment whose handler is gone never caches the error.
		expect(response.headers.get('cache-control')).toBe('no-store')
		expect(await response.json()).toEqual({ message: 'Internal Server Error' })
	})
})

describe('router event function routes', () => {
	it("should send the image server's routes to the event function's url", async () => {
		const result = createTestApp({
			app: { domains: { main: { domain: 'example.com' } }, router: { main: { domain: 'main' } } },
		})
		const addRoutes = result.shared.entry('router', 'addRoutes', 'main')

		addRoutes({ '/images/*': { type: 'event-function' }, '/api': { type: 'web-function' } })
		result.ready()

		const deployment = listResources(result.app, 'route-deployment')[0]!
		const types = findInputDeps(deployment.input.routes).map(meta => meta.type)

		expect(types).toEqual(expect.arrayContaining(['function-deployment', 'aws_lambdaweb_function_endpoint']))
		expect(deployment.config?.dependsOn?.map(dependency => getMeta(dependency).type)).toEqual(
			expect.arrayContaining(['aws_lambda_alias', 'aws_lambdaweb_resource_policy'])
		)
	})

	it('should make no function url without such routes', () => {
		const { app } = createWebApp()

		expect(listResources(app, 'function-deployment')).toEqual([])
	})
})
