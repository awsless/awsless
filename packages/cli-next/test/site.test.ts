import { findInputDeps, getMeta } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { planStaticRoutes } from '../src/feature/site/static-routes'
import { createTestApp } from './_kit'

const code = { file: { nocheck: './echo.ts' } }

describe('site ssr', () => {
	it('registers a plain ssr into the shared bundle', () => {
		const result = createTestApp({ router: { main: {} } }, undefined, [
			{
				name: 'stack-1',
				sites: {
					web: { router: 'main', path: '/', ssr: { code } },
				},
			},
		])
		result.ready()

		const metas = result.app.resources.map(getMeta)
		const lambda = metas.find(
			meta => meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--web-ssr'
		)

		expect(lambda).toBeUndefined()
	})

	it('deploys a sandboxed ssr as a stand-alone lambda behind its own url', () => {
		const result = createTestApp({ router: { main: {} } }, undefined, [
			{
				name: 'stack-1',
				sites: {
					web: {
						router: 'main',
						path: '/',
						ssr: { code, sandbox: { functions: ['stack-1:other'] } },
					},
				},
			},
		])
		result.ready()

		const metas = result.app.resources.map(getMeta)
		const lambda = metas.find(
			meta => meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--web-ssr'
		)!
		const proxy = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' &&
				meta.input.functionName === 'test-app--stack-1--function--web-ssr-proxy'
		)
		const url = metas.find(meta => meta.type === 'aws_lambda_function_url')!

		expect(lambda).toBeDefined()
		expect(lambda.input.environment.variables.SANDBOX).toBe('true')
		expect(lambda.input.environment.variables.SANDBOX_PROXY).toBe('test-app--stack-1--function--web-ssr-proxy')
		expect(proxy).toBeDefined()
		expect(url).toBeDefined()
		expect(url.input.authorizationType).toBe('AWS_IAM')

		// The route targets the stand-alone url instead of the bundle url.
		const routeDeployment = result.app.resources.find(resource => getMeta(resource).type === 'route-deployment')!
		expect(findInputDeps(getMeta(routeDeployment).input.routes).map(dependency => dependency.type)).toContain(
			'aws_lambda_function_url'
		)
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
