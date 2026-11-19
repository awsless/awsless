import { findInputDeps, getMeta } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { planStaticRoutes } from '../src/feature/site/static-routes'
import { createTestApp } from './_kit'

const code = { file: { nocheck: './echo.ts' } }

describe('site ssr', () => {
	it('registers a plain ssr into the shared bundle', () => {
		const result = createTestApp({
			defaults: { router: { main: {} } },
			stacks: [
				{
					name: 'stack-1',
					sites: {
						web: { router: 'main', path: '/', ssr: { code } },
					},
				},
			],
		})
		result.ready()

		const metas = result.app.resources.map(getMeta)
		const lambda = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' &&
				meta.input.functionName === 'test-app--stack-1--function--web-ssr'
		)

		expect(lambda).toBeUndefined()
	})

	it('deploys a sandboxed ssr as a web function of its own', () => {
		const result = createTestApp({
			defaults: { router: { main: {} } },
			stacks: [
				{
					name: 'stack-1',
					sites: {
						web: {
							router: 'main',
							path: '/',
							ssr: { code, timeout: '20 seconds', sandbox: { functions: ['stack-1:other'] } },
						},
					},
				},
			],
		})
		result.ready()

		const metas = result.app.resources.map(getMeta)
		const named = (type: string, name: string) => {
			return metas.find(meta => meta.type === type && meta.input.functionName === name)
		}

		// Never a lambda behind a function url again.
		expect(named('aws_lambda_function', 'test-app--stack-1--function--web-ssr')).toBeUndefined()
		expect(metas.some(meta => meta.type === 'function-deployment')).toBe(false)

		// A revision & an endpoint name their function by reference.
		const of = (type: string, name: string) => {
			return metas.find(
				meta => meta.type === type && findInputDeps(meta.input.functionName).includes(named('aws_lambdaweb_function', name)!)
			)
		}

		const revision = of('aws_lambdaweb_function_revision', 'test-app--stack-1--site--web')!
		const shared = of('aws_lambdaweb_function_revision', 'test-app--bundle--web')!
		const [service] = revision.input.serviceConfig

		expect(named('aws_lambdaweb_function', 'test-app--stack-1--site--web')).toBeDefined()
		expect(service.timeoutSeconds).toBe(20)
		expect(service.environmentVariables).toMatchObject({
			APP: 'test-app',
			AWS_LAMBDA_NODEJS_ENTRYPOINT: 'index.mjs',
			AWSLESS_WEB_FUNCTION_NAME: 'test-app--stack-1--site--web',
		})

		// A web function refuses an empty env value, which a sandbox without
		// configs sets: the sandbox's env is baked into the code archive.
		const proxy = named('aws_lambda_function', 'test-app--stack-1--sandbox-proxy--site-web')!

		expect(proxy).toBeDefined()

		expect(Object.values(service.environmentVariables)).not.toContain('')
		expect(service.environmentVariables.CONFIGS).toBeUndefined()
		expect(service.environmentVariables.SANDBOX_PROXY).toBeUndefined()

		// Its own code & role, on the app's one network connector.
		expect(findInputDeps(service.executionRoleArn)).not.toEqual(
			findInputDeps(shared.input.serviceConfig[0].executionRoleArn)
		)
		expect(findInputDeps(revision.input.buildConfig)).not.toEqual(findInputDeps(shared.input.buildConfig))
		expect(findInputDeps(service.egressNetworkConnectorArn)).toEqual(
			findInputDeps(shared.input.serviceConfig[0].egressNetworkConnectorArn)
		)
		expect(metas.filter(meta => meta.type === 'aws_lambdacore_network_connector')).toHaveLength(1)

		// Only the site's router may call its endpoint, and its route names it.
		const endpoint = of('aws_lambdaweb_function_endpoint', 'test-app--stack-1--site--web')!
		const policy = metas.find(
			meta => meta.type === 'aws_lambdaweb_resource_policy' && findInputDeps(meta.input.policy).includes(endpoint)
		)!

		expect(findInputDeps(policy.input.policy).map(dependency => dependency.type)).toContain(
			'aws_cloudfront_multitenant_distribution'
		)

		const routes = metas.find(meta => meta.type === 'route-deployment')!

		expect(findInputDeps(routes.input.routes)).toContain(endpoint)
		expect(routes.config?.dependsOn?.map(getMeta)).toEqual(expect.arrayContaining([revision, policy]))
	})

	it('refuses the lambda settings a web function has none of', () => {
		const createWith = (ssr: object) => {
			return createTestApp({
				defaults: { router: { main: {} } },
				stacks: [{ name: 'stack-1', sites: { web: { router: 'main', path: '/', ssr: { code, ...ssr } } } }],
			})
		}

		for (const ssr of [{ memorySize: '512 MB' }, { runtime: 'nodejs22.x' }, { layers: ['sharp'] }]) {
			expect(() => createWith(ssr)).toThrow()
		}
	})
})

describe('site static routes', () => {
	it('should give root sites per asset dir routes so dotted paths can fall through to ssr', () => {
		const plan = planStaticRoutes(
			[
				'index.html',
				'blog/index.html',
				'llms',
				'favicon.png',
				'terms.pdf',
				'_app/immutable/chunk.js',
				'country/at.svg',
				'homescreen/icon-192.png',
			],
			'/'
		)

		expect(plan.files).toStrictEqual({
			'/': 'index.html',
			'/blog': 'blog/index.html',
			'/llms': 'llms',
			'/favicon.png': 'favicon.png',
			'/terms.pdf': 'terms.pdf',
		})
		expect(plan.dirs).toStrictEqual(['/_app/*.', '/country/*.', '/homescreen/*.'])
		expect(plan.catchAll).toBeUndefined()
	})

	it('should give files inside a dotted dir an exact route', () => {
		const plan = planStaticRoutes(['assets.v2/logo.svg'], '/')

		expect(plan.files).toStrictEqual({
			'/assets.v2/logo.svg': 'assets.v2/logo.svg',
		})
		expect(plan.dirs).toStrictEqual([])
	})

	it('should keep the single catch-all for sites mounted on a sub path', () => {
		const plan = planStaticRoutes(['index.html', 'favicon.png', '_app/chunk.js'], '/docs')

		expect(plan.files).toStrictEqual({
			'/docs': 'index.html',
		})
		expect(plan.dirs).toStrictEqual([])
		expect(plan.catchAll).toBe('/docs/*.')
	})
})
