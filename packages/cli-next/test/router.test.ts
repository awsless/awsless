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

const evaluate = (code: string, values: Map<string, string>) => {
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
	const handler = new Function(
		'cf',
		`${code.replace('import cf from "cloudfront";', '')}\nreturn handler;`
	)(cf) as (event: { request: Request }) => Promise<Request | Response>

	return { get, handler, updateRequestOrigin: cf.updateRequestOrigin }
}

const createRouter = (
	values: Map<string, string>,
	props: Omit<Parameters<typeof getViewerRequestFunctionCode>[0], 'router'> = {}
) => {
	return evaluate(getViewerRequestFunctionCode({ router: 'main', ...props }), values)
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
				key: 'main:/api/*',
				value: JSON.stringify({ type: 's3', domainName: 'api.example.com' }),
			},
			{
				key: 'main:/assets/*',
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

	it('should stage every router into one deployment', () => {
		const result = createRouterApp({ main: {}, admin: {} })
		result.ready()

		const resources = result.app.resources.map(getMeta)

		expect(resources.filter(resource => resource.type === 'route-deployment')).toHaveLength(1)
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_key_value_store')).toHaveLength(1)
		// one preview distribution per router
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_distribution')).toHaveLength(2)
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_multitenant_distribution')).toHaveLength(
			2
		)
	})

	it('should keep the preview distribution on its own cloudfront host', async () => {
		const result = createRouterApp({ main: {} })
		result.ready()

		const resources = result.app.resources.map(getMeta)
		const preview = resources.find(resource => resource.type === 'aws_cloudfront_distribution')!
		const previewFn = resources.find(
			resource => resource.type === 'aws_cloudfront_function' && resource.urn.includes('preview-function')
		)!
		const productionFn = resources.find(
			resource => resource.type === 'aws_cloudfront_function' && resource.urn.includes('production-function')
		)!

		await expect(resolveInputs(preview.input.aliases)).resolves.toBeUndefined()

		// Only the preview host can select a staged deployment; production
		// always serves the active route table.
		expect(String(previewFn.input.code)).toContain('$deploy:')
		expect(String(previewFn.input.code)).toContain('awsless-deployment')
		expect(String(productionFn.input.code)).not.toContain('$deploy:')

		expect(resources.find(resource => resource.type === 'aws_acm_certificate')).toBeUndefined()
		expect(resources.find(resource => resource.type === 'aws_route53_zone')).toBeUndefined()
	})

	it('should read every route from the active route table', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/api/*', route('api.example.com')],
			['v1:main:/assets/*', route('assets.example.com')],
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

	it('should give every router its own preview distribution', async () => {
		const result = createRouterApp({ main: {}, admin: {} })
		result.ready()

		const resources = result.app.resources.map(getMeta)
		const previews = resources.filter(
			resource => resource.type === 'aws_cloudfront_distribution' && resource.urn.endsWith(':{preview}')
		)
		const previewFns = resources.filter(
			resource => resource.type === 'aws_cloudfront_function' && resource.urn.includes('preview-function')
		)

		expect(previews).toHaveLength(2)
		expect(previewFns).toHaveLength(2)

		const routers = previewFns.map(fn => String(fn.input.code).match(/const router = "(\w+)"/)?.[1]).sort()
		expect(routers).toEqual(['admin', 'main'])
	})

	it('should only use syntax the cloudfront js runtime supports', async () => {
		// The cloudfront-js-2.0 runtime rejects for...of at parse time,
		// which breaks the whole function with a 503 on every request.
		for (const preview of [true, false]) {
			expect(getViewerRequestFunctionCode({ router: 'main', preview })).not.toMatch(/for\s*\(\s*(const|let|var)\s+\w+\s+of\s/)
		}
	})

	it('should preview a staged deployment selected by query and pin it in a cookie', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['$deploy:local-2', 'v2:2'],
			['v2:main:/api/*', route('staged.example.com')],
		])
		const { get, handler } = createRouter(values, { preview: true })

		const request = createRequest('/api/users')
		request.querystring['awsless-deployment'] = { value: 'local-2' }

		const redirect = (await handler({ request })) as Response & {
			headers: Record<string, { value: string }>
			cookies: Record<string, { value: string }>
		}

		expect(redirect.statusCode).toBe(302)
		expect(redirect.headers.location!.value).toBe('/api/users')
		expect(redirect.cookies['awsless-deployment']!.value).toBe('local-2')
		expect(get).toHaveBeenCalledWith('$deploy:local-2')

		const pinned = createRequest('/api/users') as Request & {
			cookies: Record<string, { value: string }>
		}
		pinned.cookies = { 'awsless-deployment': { value: 'local-2' } }

		const routed = (await handler({ request: pinned })) as Request
		expect(routed.headers['x-origin']?.value).toBe('staged.example.com')
	})

	it('should ignore an empty preview deployment selection', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/*', route('active.example.com')],
		])
		const { handler } = createRouter(values, { preview: true })

		const request = createRequest('/index.html')
		request.querystring['awsless-deployment'] = { value: '' }

		const routed = (await handler({ request })) as Request
		expect(routed.headers['x-origin']?.value).toBe('active.example.com')
	})

	it('should return 404 for an unknown preview deployment', async () => {
		const values = new Map([['$active', 'v1:1']])
		const { handler } = createRouter(values, { preview: true })

		const request = createRequest('/')
		request.querystring['awsless-deployment'] = { value: 'missing' }

		const response = (await handler({ request })) as Response
		expect(response.statusCode).toBe(404)
	})

	it('should serve the active deployment on the preview host by default', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/*', route('active.example.com')],
		])
		const { handler } = createRouter(values, { preview: true })
		const request = (await handler({ request: createRequest('/index.html') })) as Request

		expect(request.headers['x-origin']?.value).toBe('active.example.com')
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
		expect(get.mock.calls.map(([key]) => key)).toEqual(['$active', 'v1:main:/removed', 'v1:main:/removed/*', 'v1:main:/*'])
	})

	it('should preserve viewer authorization for Lambda routes', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/api', JSON.stringify({ type: 'lambda', domainName: 'bundle.lambda-url.us-east-1.on.aws' })],
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
			['v1:main:/api', JSON.stringify({ type: 'lambda', domainName: 'bundle.lambda-url.us-east-1.on.aws' })],
		])
		const { handler } = createRouter(values)
		const request = createRequest('/api')

		request.headers['x-awsless-authorization'] = { value: 'Bearer spoofed' }

		const result = (await handler({ request })) as Request

		expect(result.headers['x-awsless-authorization']).toBeUndefined()
	})

	it('should serve assets through the single dotted-catchall route', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			[
				'v1:main:/*.',
				JSON.stringify({
					type: 's3',
					domainName: 'site.s3.amazonaws.com',
					rewrite: { regex: '^/?(.*)$', to: '/v-abc/$1' },
				}),
			],
			[
				'v1:main:/about',
				JSON.stringify({
					type: 's3',
					domainName: 'site.s3.amazonaws.com',
					rewrite: { to: '/v-abc/about.html' },
				}),
			],
			['v1:main:/api/*', route('api.example.com')],
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
			['v1:main:/docs/*', JSON.stringify({ type: 'lambda', domainName: 'ssr.example.com' })],
			[
				'v1:main:/docs/*.',
				JSON.stringify({
					type: 's3',
					domainName: 'site.s3.amazonaws.com',
					rewrite: { regex: '^/docs/?(.*)$', to: '/v-abc/$1' },
				}),
			],
			[
				'v1:main:/docs/fonts/logo',
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

})
