import { findInputDeps, getMeta, resolveInputs } from '@terraforge/core'
import { describe, expect, it, vi } from 'vitest'
import { getViewerRequestFunctionCode } from '../src/feature/router/router-code'
import { RouteSchema } from '../src/feature/router/schema'
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
	const handler = new Function('cf', `${code.replace('import cf from "cloudfront";', '')}\nreturn handler;`)(
		cf
	) as (event: { request: Request }) => Promise<Request | Response>

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
			expect.arrayContaining(['aws_cloudfront_multitenant_distribution'])
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

		expect(resources.filter(resource => resource.type === 'aws_cloudfront_distribution')).toHaveLength(0)
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_multitenant_distribution')).toHaveLength(
			1
		)
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_key_value_store')).toHaveLength(1)

		const functions = resources.filter(resource => resource.type === 'aws_cloudfront_function')
		expect(functions).toHaveLength(1)
		expect(functions.every(item => String(item.input.code).includes('$active'))).toBe(true)
		expect(functions.every(item => !String(item.input.code).includes('$deploy:'))).toBe(true)
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
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_distribution')).toHaveLength(0)
		expect(resources.filter(resource => resource.type === 'aws_cloudfront_multitenant_distribution')).toHaveLength(
			2
		)
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

	it('should only use syntax the cloudfront js runtime supports', async () => {
		// The cloudfront-js-2.0 runtime rejects for...of at parse time,
		// which breaks the whole function with a 503 on every request.
		expect(getViewerRequestFunctionCode({ router: 'main' })).not.toMatch(
			/for\s*\(\s*(const|let|var)\s+\w+\s+of\s/
		)
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
		expect(get.mock.calls.map(([key]) => key)).toEqual([
			'$active',
			'v1:main:/removed',
			'v1:main:/removed/*',
			'v1:main:/*',
		])
	})

	it('should fall dotted paths outside the asset dirs through to the catch-all route', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/_app/*.', route('assets.example.com')],
			['v1:main:/favicon.png', route('assets.example.com')],
			['v1:main:/*', JSON.stringify({ type: 'lambda', domainName: 'ssr.lambda-url.us-east-1.on.aws' })],
		])
		const { handler } = createRouter(values)
		const invoke = async (path: string) => (await handler({ request: createRequest(path) })) as Request

		await expect(invoke('/_app/immutable/chunk.js')).resolves.toMatchObject({
			headers: { 'x-origin': { value: 'assets.example.com' } },
		})
		await expect(invoke('/favicon.png')).resolves.toMatchObject({
			headers: { 'x-origin': { value: 'assets.example.com' } },
		})
		await expect(invoke('/manifest.json')).resolves.toMatchObject({
			headers: { 'x-origin': { value: 'ssr.lambda-url.us-east-1.on.aws' } },
		})
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

	it('should match trailing slash urls against their exact route', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/about', route('site.example.com')],
			['v1:main:/docs/guide', route('site.example.com')],
		])
		const { handler } = createRouter(values)
		const invoke = async (path: string) => (await handler({ request: createRequest(path) })) as Request

		await expect(invoke('/about/')).resolves.toMatchObject({
			headers: { 'x-origin': { value: 'site.example.com' } },
		})
		await expect(invoke('/docs/guide/')).resolves.toMatchObject({
			headers: { 'x-origin': { value: 'site.example.com' } },
		})
		await expect(invoke('/about')).resolves.toMatchObject({
			headers: { 'x-origin': { value: 'site.example.com' } },
		})
	})

	it('should only accept single segment router paths', () => {
		for (const path of ['/', '/api', '/rpc-v2', '/api_internal']) {
			expect(RouteSchema.safeParse(path).success, path).toBe(true)
		}

		for (const path of ['/docs/v2', '/api.v2', '/docs/', 'docs', '/api/*']) {
			expect(RouteSchema.safeParse(path).success, path).toBe(false)
		}
	})

	it('should discard a spoofed forwarded host header', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/api', JSON.stringify({ type: 'lambda', domainName: 'bundle.lambda-url.us-east-1.on.aws' })],
		])
		const { handler } = createRouter(values)
		const request = createRequest('/api')

		request.headers['x-forwarded-host'] = { value: 'evil.com' }

		const result = (await handler({ request })) as Request

		expect(result.headers['x-forwarded-host']).toBeUndefined()
	})

	it('should forward the host when the route opts in', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			[
				'v1:main:/api',
				JSON.stringify({
					type: 'lambda',
					domainName: 'bundle.lambda-url.us-east-1.on.aws',
					forwardHost: true,
				}),
			],
		])
		const { handler } = createRouter(values)
		const request = createRequest('/api', 'example.com')

		request.headers['x-forwarded-host'] = { value: 'evil.com' }

		const result = (await handler({ request })) as Request

		expect(result.headers['x-forwarded-host']).toEqual({ value: 'example.com' })
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

	// The route table of a real site, where every top level asset folder
	// collapses into one wildcard. Each request pays one read for the active
	// deployment pointer, plus one per probed route key.
	it('should read the route store a fixed number of times per request', async () => {
		const asset = JSON.stringify({
			type: 's3',
			domainName: 'site.s3.amazonaws.com',
			rewrite: { regex: '^/?(.*)$', to: '/v-abc/$1' },
		})
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/_app/*.', asset],
			['v1:main:/country/*.', asset],
			['v1:main:/homescreen/*.', asset],
			['v1:main:/favicon.png', asset],
			['v1:main:/sportsbook-terms.pdf', asset],
			['v1:main:/*', JSON.stringify({ type: 'lambda', domainName: 'ssr.example.com' })],
		])

		const { get, handler } = createRouter(values)
		const reads = async (path: string) => {
			get.mockClear()
			await handler({ request: createRequest(path) })

			return get.mock.calls.map(call => call[0])
		}

		// the home page: 3 reads
		// old: 2 reads — ['/', '/*']
		expect(await reads('/')).toStrictEqual(['$active', 'v1:main:/', 'v1:main:/*'])

		// an ssr page: 4 reads
		// old: 3 reads — ['/casino', '/casino/*', '/*']
		expect(await reads('/casino')).toStrictEqual([
			'$active',
			'v1:main:/casino',
			'v1:main:/casino/*',
			'v1:main:/*',
		])

		// a hashed asset inside a folder: 3 reads
		// old: 1 read — the file had its own route key
		expect(await reads('/_app/immutable/chunks/206gktiV.js')).toStrictEqual([
			'$active',
			'v1:main:/_app/immutable/chunks/206gktiV.js',
			'v1:main:/_app/*.',
		])

		// a loose root file: 2 reads
		// old: 1 read
		expect(await reads('/favicon.png')).toStrictEqual(['$active', 'v1:main:/favicon.png'])

		// an unregistered dotted path falling through to ssr: 4 reads
		// old: 2 reads — ['/robots.txt', '/*']
		expect(await reads('/robots.txt')).toStrictEqual([
			'$active',
			'v1:main:/robots.txt',
			'v1:main:/*.',
			'v1:main:/*',
		])
	})
})

describe('router route patterns', () => {
	it('should compile patterns into route keys, matchers & params', async () => {
		const { compileRoutePattern } = await import('../src/feature/router/pattern')

		expect(compileRoutePattern('/sitemap.xml')).toEqual({ key: '/sitemap.xml' })
		expect(compileRoutePattern('/files/*')).toEqual({ key: '/files/*' })
		expect(compileRoutePattern('/*')).toEqual({ key: '/*' })

		const compiled = compileRoutePattern('/sitemap/{locale}/games/{page}.xml')
		expect(compiled.key).toBe('/sitemap/*')
		expect(compiled.params).toEqual(['locale', 'page'])
		expect('/sitemap/en/games/5.xml'.match(new RegExp(compiled.match!))?.slice(1)).toEqual(['en', '5'])
		expect('/sitemap/en/static.xml'.match(new RegExp(compiled.match!))).toBeNull()

		const deep = compileRoutePattern('/files/a/*')
		expect(deep.key).toBe('/files/*')
		expect('/files/a/b/c'.match(new RegExp(deep.match!))).toBeTruthy()
		expect('/files/b/c'.match(new RegExp(deep.match!))).toBeNull()

		expect(() => compileRoutePattern('sitemap')).toThrow('must start with a slash')
		expect(() => compileRoutePattern('/{locale}/home')).toThrow('must be static')
		expect(() => compileRoutePattern('/api.v1/{id}')).toThrow(`can't contain a dot`)
		expect(() => compileRoutePattern('/x/{id}/{id}')).toThrow('Duplicate param')
	})

	it('should match route lists in order & forward params as headers', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			[
				'v1:main:/sitemap/*',
				JSON.stringify([
					{
						type: 'lambda',
						domainName: 'bundle.example.com',
						match: '^/sitemap/([^/]+)/static\\.xml$',
						params: ['locale'],
						requestHeaders: { 'x-awsless-route': 'web:route:static' },
					},
					{
						type: 'lambda',
						domainName: 'bundle.example.com',
						match: '^/sitemap/([^/]+)/games/([^/]+)\\.xml$',
						params: ['locale', 'page'],
						requestHeaders: { 'x-awsless-route': 'web:route:games' },
					},
					{
						type: 'lambda',
						domainName: 'bundle.example.com',
						requestHeaders: { 'x-awsless-route': 'web:route:fallback' },
					},
				]),
			],
			['v1:main:/*', JSON.stringify({ type: 's3', domainName: 'site.s3.amazonaws.com' })],
		])
		const { handler } = createRouter(values)
		const invoke = async (path: string, headers: Record<string, { value: string }> = {}) => {
			const request = createRequest(path)
			Object.assign(request.headers, headers)
			return (await handler({ request })) as Request
		}

		// a param route matches & forwards its params
		const games = await invoke('/sitemap/en/games/5.xml')
		expect(games.headers['x-awsless-route']?.value).toBe('web:route:games')
		expect(games.headers['x-param-locale']?.value).toBe('en')
		expect(games.headers['x-param-page']?.value).toBe('5')

		// param values are uri encoded
		const encoded = await invoke('/sitemap/en%20us/static.xml')
		expect(encoded.headers['x-awsless-route']?.value).toBe('web:route:static')
		expect(encoded.headers['x-param-locale']?.value).toBe('en%20us')

		// a client provided param header never reaches the origin
		const spoofed = await invoke('/sitemap/en/misc.bin', {
			'x-param-locale': { value: 'evil' },
			'x-param-injected': { value: 'evil' },
		})
		expect(spoofed.headers['x-awsless-route']?.value).toBe('web:route:fallback')
		expect(spoofed.headers['x-param-locale']).toBeUndefined()
		expect(spoofed.headers['x-param-injected']).toBeUndefined()

		// a trailing slash still matches the pattern
		const slash = await invoke('/sitemap/en/static.xml/')
		expect(slash.headers['x-awsless-route']?.value).toBe('web:route:static')
		expect(slash.uri).toBe('/sitemap/en/static.xml/')
	})

	it('should fall through to the next route key when no list entry matches', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			[
				'v1:main:/sitemap/*',
				JSON.stringify([
					{
						type: 'lambda',
						domainName: 'bundle.example.com',
						match: '^/sitemap/([^/]+)/static\\.xml$',
						params: ['locale'],
					},
				]),
			],
			['v1:main:/*', JSON.stringify({ type: 's3', domainName: 'site.s3.amazonaws.com' })],
		])
		const { handler } = createRouter(values)

		const request = (await handler({ request: createRequest('/sitemap/nope') })) as Request
		expect(request.headers['x-origin']?.value).toBe('site.s3.amazonaws.com')
	})

	it('should serialize stack route patterns into grouped route entries', async () => {
		const result = createTestApp({ router: { main: {} } }, undefined, [
			{
				name: 'web',
				routes: {
					main: {
						'/sitemap.xml': { code: { file: { nocheck: './root.ts' } } },
						'/sitemap/{locale}/static.xml': { code: { file: { nocheck: './static.ts' } } },
						'/sitemap/*': { code: { file: { nocheck: './fallback.ts' } } },
					},
				},
			},
		])
		result.ready()

		const deployment = result.app.resources.map(getMeta).find(meta => meta.type === 'route-deployment')!
		const dependencies = findInputDeps(deployment.input.routes).map(dependency => dependency.type)

		expect(dependencies).toContain('function-deployment')
	})

	it('should reject stack routes for an unknown router', () => {
		expect(() =>
			createTestApp({ router: { main: {} } }, undefined, [
				{
					name: 'web',
					routes: {
						other: {
							'/sitemap.xml': { code: { file: { nocheck: './root.ts' } } },
						},
					},
				},
			])
		).toThrow('Router "other" is not defined on the app level.')
	})

	it('should shard a route list that outgrows a route store value', async () => {
		const result = createRouterApp({ main: {} })
		const addRoutes = result.shared.entry('router', 'addRoutes', 'main')
		const list = Array.from({ length: 20 }).map((_, i) => ({
			type: 's3' as const,
			domainName: `files-${i}.s3.amazonaws.com`,
			match: `^/files/deep/nested/folder/pattern-number-${i}/([^/]+)\\.json$`,
			params: ['name'],
		}))

		addRoutes({ '/files/*': list })
		result.ready()

		const deployment = result.app.resources.map(getMeta).find(meta => meta.type === 'route-deployment')!
		const entries = (await resolveInputs(deployment.input.routes)) as { key: string; value: string }[]

		expect(entries.find(entry => entry.key === 'main:/files/*')?.value).toBe(JSON.stringify({ list: 20 }))
		expect(entries.find(entry => entry.key === 'main:/files/*#0')?.value).toBe(JSON.stringify(list[0]))
		expect(entries.find(entry => entry.key === 'main:/files/*#19')?.value).toBe(JSON.stringify(list[19]))
	})

	it('should match sharded route lists', async () => {
		const values = new Map([
			['$active', 'v1:1'],
			['v1:main:/sitemap/*', JSON.stringify({ list: 2 })],
			[
				'v1:main:/sitemap/*#0',
				JSON.stringify({
					type: 'lambda',
					domainName: 'bundle.example.com',
					match: '^/sitemap/([^/]+)/static\\.xml$',
					params: ['locale'],
					requestHeaders: { 'x-awsless-route': 'web:route:static' },
				}),
			],
			[
				'v1:main:/sitemap/*#1',
				JSON.stringify({
					type: 'lambda',
					domainName: 'bundle.example.com',
					requestHeaders: { 'x-awsless-route': 'web:route:fallback' },
				}),
			],
		])
		const { handler } = createRouter(values)
		const invoke = async (path: string) => (await handler({ request: createRequest(path) })) as Request

		const matched = await invoke('/sitemap/en/static.xml')
		expect(matched.headers['x-awsless-route']?.value).toBe('web:route:static')
		expect(matched.headers['x-param-locale']?.value).toBe('en')

		const fallback = await invoke('/sitemap/en/other.bin')
		expect(fallback.headers['x-awsless-route']?.value).toBe('web:route:fallback')
	})

	it('should reject a single route that outgrows a route store value', () => {
		const result = createRouterApp({ main: {} })
		const addRoutes = result.shared.entry('router', 'addRoutes', 'main')

		expect(() =>
			addRoutes({
				'/files/*': {
					type: 's3',
					domainName: 'files.s3.amazonaws.com',
					rewrite: { to: `/${'x'.repeat(1000)}` },
				},
			})
		).toThrow('too large')
	})
})
