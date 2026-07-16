import { findInputDeps, getMeta, resolveInputs } from '@terraforge/core'
import { describe, expect, it, vi } from 'vitest'
import { getViewerRequestFunctionCode } from '../src/feature/router/router-code'
import { createTestApp } from './_kit'

type Request = {
	uri: string
	method: string
	headers: Record<string, { value: string }>
	querystring: Record<string, unknown>
}

type Response = {
	statusCode: number
}

const createRequest = (uri: string, host?: string): Request => ({
	uri,
	method: 'GET',
	headers: host ? { host: { value: host } } : {},
	querystring: {},
})

const createRouter = (values: Map<string, string>, props: Parameters<typeof getViewerRequestFunctionCode>[0] = {}) => {
	const get = vi.fn(async (key: string, options?: { format?: string }) => {
		const value = values.get(key)

		if (value === undefined) {
			throw new Error(`Unknown key: ${key}`)
		}

		return options?.format === 'json' ? JSON.parse(value) : value
	})
	const cf = {
		kvs: () => ({ get }),
		updateRequestOrigin: vi.fn(),
	}
	const code = getViewerRequestFunctionCode(props).replace('import cf from "cloudfront";', '')
	const handler = new Function('cf', `${code}\nreturn handler;`)(cf) as (event: {
		request: Request
	}) => Promise<Request | Response>

	return { get, handler, updateRequestOrigin: cf.updateRequestOrigin }
}

const route = (domainName: string) => JSON.stringify({ type: 's3', domainName })

const createRouterApp = (routers: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
	createTestApp({ router: routers, ...extra })

describe('router routes', () => {
	it('should collect every route into one deployment', async () => {
		const result = createRouterApp({ main: {} })
		const addRoutes = result.shared.entry('router', 'addRoutes', 'main')

		addRoutes({ '/api/*': { type: 's3', domainName: 'api.example.com' } })
		addRoutes({ '/assets/*': { type: 's3', domainName: 'assets.example.com' } })
		result.ready()

		const deployments = result.app.resources.map(getMeta).filter(meta => meta.type === 'route-deployment')

		expect(deployments).toHaveLength(1)
		await expect(resolveInputs(deployments[0]!.input.routes)).resolves.toEqual([
			{
				key: '/api/*',
				value: JSON.stringify({ type: 's3', domainName: 'api.example.com' }),
			},
			{
				key: '/assets/*',
				value: JSON.stringify({ type: 's3', domainName: 'assets.example.com' }),
			},
		])
	})

	it('should prepare an immutable Lambda URL for Lambda routes', () => {
		const result = createRouterApp({ main: {} })
		const addRoutes = result.shared.entry('router', 'addRoutes', 'main')

		addRoutes({ '/rpc/*': { type: 'lambda' } })
		result.ready()

		const functionDeployment = result.app.resources.find(
			resource => getMeta(resource).type === 'function-deployment'
		)!
		const routeDeployment = result.app.resources.find(resource => getMeta(resource).type === 'route-deployment')!

		expect(findInputDeps(getMeta(routeDeployment).input.routes)).toContain(getMeta(functionDeployment))
		const sourceArnDependencies = findInputDeps(getMeta(functionDeployment).input.sourceArns)
		expect(sourceArnDependencies.map(dependency => dependency.type)).toEqual(
			expect.arrayContaining(['aws_cloudfront_distribution', 'aws_cloudfront_multitenant_distribution'])
		)
		expect(getMeta(routeDeployment).config?.dependsOn?.map(dependency => getMeta(dependency).type)).toEqual(
			expect.arrayContaining(['aws_iam_role_policy', 'aws_lambda_alias'])
		)
	})

	it('should provision the routers on one shared active-pointer store', async () => {
		const result = createRouterApp({ main: {} })
		result.ready()

		const resources = result.app.resources.map(getMeta)
		const deployment = resources.find(resource => resource.type === 'route-deployment')!

		expect(resources.filter(resource => resource.type === 'aws_cloudfront_distribution')).toHaveLength(1)
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_multitenant_distribution')).toHaveLength(
			1
		)
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_key_value_store')).toHaveLength(1)

		const functions = resources.filter(resource => resource.type === 'aws_cloudfront_function')
		expect(functions).toHaveLength(2)
		expect(functions.every(item => String(item.input.code).includes('$active'))).toBe(true)
		expect(findInputDeps(deployment.input.storeArn).map(dependency => dependency.type)).toContain(
			'aws_cloudfront_key_value_store'
		)

		const production = resources.find(resource => resource.type === 'aws_cloudfront_multitenant_distribution')!
		const origin = production.input.origin[0]

		expect(origin.domainName).toBe('placeholder.awsless.dev')
		expect(origin.customOriginConfig[0].originProtocolPolicy).toBe('http-only')
	})

	it('should stage one deployment per router', () => {
		const result = createRouterApp({ main: {}, admin: {} })
		result.ready()

		const resources = result.app.resources.map(getMeta)

		expect(resources.filter(resource => resource.type === 'route-deployment')).toHaveLength(2)
	})

	it('should not create deployment url resources without a deployment domain', async () => {
		const result = createRouterApp({ main: {} })
		result.ready()

		const resources = result.app.resources.map(getMeta)
		const preview = resources.find(resource => resource.type === 'aws_cloudfront_distribution')!
		const deployment = resources.find(resource => resource.type === 'route-deployment')!

		await expect(resolveInputs(preview.input.aliases)).resolves.toBeUndefined()
		const preview2 = resources.find(
			resource => resource.type === 'aws_cloudfront_function' && resource.urn.includes('preview-function')
		)!
		expect(String(preview2.input.code)).not.toContain('$deploy:')
		expect(resources.find(resource => resource.type === 'aws_acm_certificate')).toBeUndefined()
	})

	it('should reject invalid deployment domain configurations', () => {
		expect(() => createRouterApp({ main: {}, admin: {} }, { deploymentDomain: 'example-deploys.com' })).toThrow(
			`A deploymentDomain currently only supports apps with a single router.`
		)
		const domains = { primary: { domain: 'example.com' } }

		expect(() => createRouterApp({ main: {} }, { domains, deploymentDomain: 'example.com' })).toThrow(
			`can't overlap`
		)
		expect(() => createRouterApp({ main: {} }, { domains, deploymentDomain: 'deploys.example.com' })).toThrow(
			`can't overlap`
		)
		expect(() =>
			createRouterApp(
				{ main: {} },
				{ domains: { primary: { domain: 'app.example-deploys.com' } }, deploymentDomain: 'example-deploys.com' }
			)
		).toThrow(`can't overlap`)
	})

	it('should reject RPC timeouts above the CloudFront origin limit', () => {
		expect(() =>
			createRouterApp(
				{ main: {} },
				{
					rpc: {
						api: {
							router: 'main',
							path: '/api',
							timeout: '3 minutes',
						},
					},
				}
			)
		).toThrow('Maximum timeout duration is 2 minutes')
	})

	it('should serve deployment urls from a wildcard on the dedicated deployment domain', async () => {
		const result = createRouterApp({ main: {} }, { deploymentDomain: 'example-deploys.com' })
		result.ready()

		const resources = result.app.resources.map(getMeta)
		const preview = resources.find(resource => resource.type === 'aws_cloudfront_distribution')!
		const deployment = resources.find(resource => resource.type === 'route-deployment')!
		const zone = resources.find(resource => resource.type === 'aws_route53_zone')!
		const certificate = resources.find(resource => resource.type === 'aws_acm_certificate')!
		const record = resources.find(
			resource => resource.type === 'aws_route53_record' && resource.urn.includes('deploy-url-record')
		)!

		await expect(resolveInputs(zone.input.name)).resolves.toBe('example-deploys.com')
		await expect(resolveInputs(certificate.input.domainName)).resolves.toBe('example-deploys.com')
		await expect(resolveInputs(certificate.input.subjectAlternativeNames)).resolves.toEqual([
			'*.example-deploys.com',
		])
		await expect(resolveInputs(preview.input.aliases)).resolves.toEqual(['*.example-deploys.com'])
		const previewFn = resources.find(
			resource => resource.type === 'aws_cloudfront_function' && resource.urn.includes('preview-function')
		)!
		expect(String(previewFn.input.code)).toContain('$deploy:')
		await expect(resolveInputs(record.input.name)).resolves.toBe('*.example-deploys.com')
	})

	it('should read every route from the active route table', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:/api/*', route('api.example.com')],
			['v1:/assets/*', route('assets.example.com')],
		])
		const { handler } = createRouter(values)
		const invoke = async (path: string) => {
			const request = (await handler({ request: createRequest(path) })) as Request
			return request.headers['x-origin']?.value
		}

		await expect(Promise.all([invoke('/api/users'), invoke('/assets/logo.svg')])).resolves.toEqual([
			'api.example.com',
			'assets.example.com',
		])
	})

	it('should return 503 without a staged deployment', async () => {
		const values = new Map<string, string>()
		const { get, handler } = createRouter(values)
		const response = (await handler({ request: createRequest('/removed') })) as Response

		expect(response.statusCode).toBe(503)
		expect(get.mock.calls.map(([key]) => key)).toEqual(['$active'])
	})

	it('should return 404 without a matching route', async () => {
		const values = new Map([['$active', 'v1:1']])
		const { get, handler } = createRouter(values)
		const response = (await handler({ request: createRequest('/removed') })) as Response

		expect(response.statusCode).toBe(404)
		expect(get.mock.calls.map(([key]) => key)).toEqual(['$active', 'v1:/removed', 'v1:/removed/*', 'v1:/*'])
	})

	it('should preserve viewer authorization for Lambda routes', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:/api', JSON.stringify({ type: 'lambda', domainName: 'bundle.lambda-url.us-east-1.on.aws' })],
		])
		const { handler, updateRequestOrigin } = createRouter(values)
		const request = createRequest('/api')

		request.headers.authorization = { value: 'Bearer viewer-token' }

		const result = (await handler({ request })) as Request

		expect(result.headers['x-awsless-authorization']).toEqual({ value: 'Bearer viewer-token' })
		expect(updateRequestOrigin).toHaveBeenCalledWith(
			expect.objectContaining({
				timeouts: {
					readTimeout: 120,
					connectionTimeout: 10,
				},
			})
		)
	})

	it('should discard a spoofed forwarded authorization header', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:/api', JSON.stringify({ type: 'lambda', domainName: 'bundle.lambda-url.us-east-1.on.aws' })],
		])
		const { handler } = createRouter(values)
		const request = createRequest('/api')

		request.headers['x-awsless-authorization'] = { value: 'Bearer spoofed' }

		const result = (await handler({ request })) as Request

		expect(result.headers['x-awsless-authorization']).toBeUndefined()
	})

	it('should resolve deployment url hosts to their pinned route table', async () => {
		const values = new Map([
			['$active', 'v2:43'],
			['$deploy:42', 'v1:19'],
			['v1:/api/*', route('api-old.example.com')],
			['v2:/api/*', route('api.example.com')],
		])
		const { handler } = createRouter(values, { deployUrls: true })
		const invoke = async (path: string, host: string) => {
			const request = (await handler({ request: createRequest(path, host) })) as Request
			return request.headers['x-origin']?.value
		}

		await expect(invoke('/api/users', 'main-42.example.com')).resolves.toBe('api-old.example.com')
		await expect(invoke('/api/users', 'd111111abcdef8.cloudfront.net')).resolves.toBe('api.example.com')
	})

	it('should serve assets through the single dotted-catchall route', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			[
				'v1:/*.',
				JSON.stringify({
					type: 's3',
					domainName: 'site.s3.amazonaws.com',
					rewrite: { regex: '^/?(.*)$', to: '/v-abc/$1' },
				}),
			],
			[
				'v1:/about',
				JSON.stringify({
					type: 's3',
					domainName: 'site.s3.amazonaws.com',
					rewrite: { to: '/v-abc/about.html' },
				}),
			],
			['v1:/api/*', route('api.example.com')],
		])
		const { handler } = createRouter(values)
		const invoke = async (path: string) => (await handler({ request: createRequest(path) })) as Request

		// a dotted file resolves via the asset route with the regex rewrite
		const asset = await invoke('/assets/app-8f3a.js')
		expect(asset.headers['x-origin']?.value).toBe('site.s3.amazonaws.com')
		expect(asset.uri).toBe('/v-abc/assets/app-8f3a.js')

		// a root level dotted file works the same way
		const icon = await invoke('/favicon.ico')
		expect(icon.uri).toBe('/v-abc/favicon.ico')

		// pretty html pages keep their own exact route
		const page = await invoke('/about')
		expect(page.uri).toBe('/v-abc/about.html')

		// dotted segments in api paths still prefer the api route
		const api = await invoke('/api/v1.2/users')
		expect(api.headers['x-origin']?.value).toBe('api.example.com')
		expect(api.uri).toBe('/api/v1.2/users')
	})

	it('should serve subpath site assets from s3 instead of the ssr lambda', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:/docs/*', JSON.stringify({ type: 'lambda', domainName: 'ssr.example.com' })],
			[
				'v1:/docs/*.',
				JSON.stringify({
					type: 's3',
					domainName: 'site.s3.amazonaws.com',
					rewrite: { regex: '^/docs/?(.*)$', to: '/v-abc/$1' },
				}),
			],
			[
				'v1:/docs/fonts/logo',
				JSON.stringify({
					type: 's3',
					domainName: 'site.s3.amazonaws.com',
					rewrite: { to: '/v-abc/fonts/logo' },
				}),
			],
		])
		const { handler } = createRouter(values)
		const invoke = async (path: string) => (await handler({ request: createRequest(path) })) as Request

		// dotted files under the subpath resolve via the asset route
		const asset = await invoke('/docs/app.js')
		expect(asset.headers['x-origin']?.value).toBe('site.s3.amazonaws.com')
		expect(asset.uri).toBe('/v-abc/app.js')

		// extensionless files resolve via their exact route
		const font = await invoke('/docs/fonts/logo')
		expect(font.headers['x-origin']?.value).toBe('site.s3.amazonaws.com')
		expect(font.uri).toBe('/v-abc/fonts/logo')

		// pages without their own route still reach the ssr lambda
		const page = await invoke('/docs/getting-started')
		expect(page.headers['x-origin']?.value).toBe('ssr.example.com')
		expect(page.uri).toBe('/docs/getting-started')
	})

	it('should return 404 for unknown deployment url hosts', async () => {
		const values = new Map([['$active', 'v2:43']])
		const { handler } = createRouter(values, { deployUrls: true })
		const response = (await handler({
			request: createRequest('/api/users', 'main-43.example.com'),
		})) as Response

		expect(response.statusCode).toBe(404)
	})
})
