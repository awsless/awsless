import { AddressInfo } from 'net'
import { findInputDeps, getMeta } from '@terraforge/core'
import { h, isInsideBundle } from 'awsless'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

	it("should keep the web function's own headers from the caller", () => {
		const { app } = createWebApp()
		const policy = listResources(app, 'aws_cloudfront_response_headers_policy')[0]!

		expect(policy.input.removeHeadersConfig.items).toEqual(
			expect.arrayContaining([{ header: 'lambda-web-logstream' }, { header: 'lambda-web-request-id' }])
		)
	})

	it('should only let the distributions call the endpoint', () => {
		const { app } = createWebApp()
		const policy = listResources(app, 'aws_lambdaweb_resource_policy')[0]!
		const endpoint = listResources(app, 'aws_lambdaweb_function_endpoint')[0]!
		const distribution = listResources(app, 'aws_cloudfront_multitenant_distribution')[0]!

		expect(findInputDeps(policy.input.policy)).toEqual(expect.arrayContaining([endpoint, distribution]))
	})
})

describe('web function defaults & a route of its own', () => {
	const createWith = (props: { webFunction?: object; route?: object }) => {
		const result = createTestApp({
			app: {
				domains: { main: { domain: 'example.com' } },
				router: { main: { domain: 'main' } },
				function: { timeout: '5 minutes' },
				...(props.webFunction ? { webFunction: props.webFunction } : {}),
			},
			stacks: [{ name: 'api', routes: { main: { '/plain': { code }, '/own': { code, ...props.route } } } }],
		})

		result.ready()

		return result
	}

	const serviceOf = (app: ReturnType<typeof createWith>['app'], name: string) => {
		const revision = listResources(app, 'aws_lambdaweb_function_revision').find(
			meta => meta.input.serviceConfig[0].environmentVariables.AWSLESS_WEB_FUNCTION_NAME === name
		)

		return revision?.input.serviceConfig[0]
	}

	it("should take the function defaults for what the app's webFunction leaves out", () => {
		expect(serviceOf(createWith({}).app, 'test-app--bundle--web').timeoutSeconds).toBe(300)

		const { app } = createWith({ webFunction: { timeout: '30 seconds', log: { level: 'warn' } } })
		const service = serviceOf(app, 'test-app--bundle--web')

		expect(service.timeoutSeconds).toBe(30)
		expect(service.telemetryConfig[0].loggingConfig[0].applicationLogLevel).toBe('WARN')
	})

	it('should keep a route without a config of its own in the shared web function', () => {
		const { app } = createWith({})

		expect(listResources(app, 'aws_lambdaweb_function')).toHaveLength(1)
	})

	it('should give a route with a config of its own a web function of its own', () => {
		const { app } = createWith({
			webFunction: { timeout: '30 seconds' },
			route: { environment: { MODE: 'strict' }, permissions: [{ actions: ['s3:GetObject'], resources: ['*'] }] },
		})

		const own = listResources(app, 'aws_lambdaweb_function').find(
			meta => meta.input.functionName !== 'test-app--bundle--web'
		)!
		const service = serviceOf(app, own.input.functionName)
		const endpoint = listResources(app, 'aws_lambdaweb_function_endpoint').find(meta =>
			findInputDeps(meta.input.functionName).includes(own)
		)!

		expect(own.input.functionName).toMatch(/^test-app--api--route--own-/)
		// The app's web function default, as the route sets no timeout itself.
		expect(service.timeoutSeconds).toBe(30)
		expect(service.environmentVariables.AWS_LAMBDA_NODEJS_ENTRYPOINT).toBe('index.mjs')
		// Its own env is baked into its code archive, next to the app's.
		expect(service.environmentVariables.MODE).toBeUndefined()
		expect(findInputDeps(listResources(app, 'route-deployment')[0]!.input.routes)).toContain(endpoint)
		expect(service.maxConcurrencyPerEnvironment).toBeUndefined()
	})

	it('should serve one request at a time in a sandboxed web function', () => {
		const { app } = createWith({ route: { sandbox: {} } })

		const own = listResources(app, 'aws_lambdaweb_function').find(
			meta => meta.input.functionName !== 'test-app--bundle--web'
		)!

		expect(serviceOf(app, own.input.functionName).maxConcurrencyPerEnvironment).toBe(1)
		expect(serviceOf(app, 'test-app--bundle--web').maxConcurrencyPerEnvironment).toBeUndefined()
	})
})

describe('web function sourcemaps', () => {
	it("should index every web function's maps under its revision, the shared one's at the bundle's", () => {
		const { app } = createTestApp({
			app: {
				domains: { main: { domain: 'example.com' } },
				router: { main: { domain: 'main' } },
				onErrorLog: { code },
			},
			stacks: [
				{ name: 'api', routes: { main: { '/plain': { code }, '/own': { code, timeout: '20 seconds' } } } },
			],
		})

		const indexes = listResources(app, 'sourcemap-deployment')
		const shared = indexes.find(meta => meta.input.name === 'test-app--bundle--web')!
		const own = indexes.find(meta => String(meta.input.name).startsWith('test-app--api--route--own-'))!
		const revisionOf = (meta: typeof shared) => findInputDeps(meta.input.version).map(dependency => dependency.type)

		// The shared one runs the event function's bundle, which uploads the maps.
		expect(shared.input.maps).toBe('test-app--bundle--event')
		expect(revisionOf(shared)).toEqual(['aws_lambdaweb_function_revision'])

		expect(own.input.maps).toBeUndefined()
		expect(revisionOf(own)).toEqual(['aws_lambdaweb_function_revision'])
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

	// A plain handler, which takes an event & no web request.
	const echoRoute = async () => ({ statusCode: 201 })

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

	it('should refuse a route that takes no web request', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const url = await startServer()
		const response = await fetch(`${url}/echo`, { headers: { 'x-awsless-route': 'api:route:echo' } })

		expect(response.status).toBe(500)
		expect(String(error.mock.calls[0]?.[0])).toContain('Wrap its handler in h.route()')

		error.mockRestore()
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
