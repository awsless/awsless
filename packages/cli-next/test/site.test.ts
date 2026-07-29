import { describe, expect, it } from 'vitest'
import { planStaticRoutes } from '../src/feature/site/static-routes'

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
