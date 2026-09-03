import { describe, expect, it, vi } from 'vitest'
import { compileRoutes } from '../src/dev/router'
import { DevRoute } from '../src/feature'
import { compileRoutePattern } from '../src/feature/router/pattern'
import { getViewerRequestFunctionCode } from '../src/feature/router/router-code'

type ViewerRequest = {
	uri: string
	method: string
	headers: Record<string, { value: string }>
	querystring: Record<string, unknown>
}

// The same route table, once as the dev routes & once as the key
// value store the deployed viewer function reads - so both sides can
// resolve the same paths & their answers can be compared.
const table: { pattern: string; rawKey?: boolean }[] = [
	{ pattern: '/' },
	{ pattern: '/about' },
	{ pattern: '/favicon.png' },
	{ pattern: '/api/*' },
	{ pattern: '/users/{id}' },
	{ pattern: '/users/{id}/posts/{post}' },
	{ pattern: '/users/*' },
	{ pattern: '/docs/*' },
	{ pattern: '/docs/*.', rawKey: true },
	{ pattern: '/_app/*.', rawKey: true },
	{ pattern: '/*' },
]

const devRoutes: DevRoute[] = table.map(({ pattern, rawKey }) => ({
	routerId: 'main',
	pattern,
	rawKey,
	routeKey: `stack:${pattern}`,
}))

const storeValues = () => {
	const lists = new Map<string, Record<string, unknown>[]>()

	for (const { pattern, rawKey } of table) {
		const compiled = rawKey ? { key: pattern } : compileRoutePattern(pattern)
		const list = lists.get(compiled.key) ?? []

		list.push({
			type: 'lambda',
			domainName: `stack:${pattern}`,
			...('match' in compiled && compiled.match ? { match: compiled.match } : {}),
			...('params' in compiled && compiled.params ? { params: compiled.params } : {}),
		})

		lists.set(compiled.key, list)
	}

	const values = new Map([['$active', 'v1:1']])

	for (const [key, list] of lists) {
		// The deployment writes regex routes ahead of the plain wildcard,
		// exactly like the dev matcher sorts its lists.
		const sorted = list.toSorted((a, b) => Number(!a.match) - Number(!b.match))

		values.set(`v1:main:${key}`, JSON.stringify(sorted.length === 1 ? sorted[0] : sorted))
	}

	return values
}

const viewer = (values: Map<string, string>) => {
	const get = vi.fn(async (key: string, options?: { format?: string }) => {
		const value = values.get(key)

		if (value === undefined) {
			throw new Error(`Unknown key: ${key}`)
		}

		return options?.format === 'json' ? JSON.parse(value) : value
	})
	const cf = { kvs: () => ({ get }), updateRequestOrigin: vi.fn() }
	const code = getViewerRequestFunctionCode({ router: 'main' })

	// oxlint-disable-next-line no-implied-eval
	return new Function('cf', `${code.replace('import cf from "cloudfront";', '')}\nreturn handler;`)(cf) as (event: {
		request: ViewerRequest
	}) => Promise<ViewerRequest | { statusCode: number }>
}

const resolveDeployed = async (path: string) => {
	const handler = viewer(storeValues())
	const result = await handler({ request: { uri: path, method: 'GET', headers: {}, querystring: {} } })

	if (!('headers' in result)) {
		return undefined
	}

	const params: Record<string, string> = {}

	for (const [name, header] of Object.entries(result.headers)) {
		if (name.startsWith('x-param-')) {
			params[name.slice('x-param-'.length)] = decodeURIComponent(header.value)
		}
	}

	return { routeKey: result.headers['x-origin']!.value, params }
}

const resolveLocal = (path: string) => {
	const result = compileRoutes(devRoutes)(path)

	return result ? { routeKey: result.routeKey, params: result.params } : undefined
}

describe('dev router route store matcher', () => {
	const cases: [string, string | undefined, Record<string, string>?][] = [
		['/', 'stack:/'],
		['/about', 'stack:/about'],
		['/about/', 'stack:/about'],
		['/favicon.png', 'stack:/favicon.png'],
		['/api/v1/things', 'stack:/api/*'],
		['/api/v1.2/users', 'stack:/api/*'],
		['/users/42', 'stack:/users/{id}', { id: '42' }],
		['/users/42/posts/7', 'stack:/users/{id}/posts/{post}', { id: '42', post: '7' }],
		['/users/42/settings', 'stack:/users/*'],
		['/docs/getting-started', 'stack:/docs/*'],
		['/docs/app.js', 'stack:/docs/*.'],
		['/_app/immutable/chunk.js', 'stack:/_app/*.'],
		['/manifest.json', 'stack:/*'],
		['/unknown/path', 'stack:/*'],
	]

	it.each(cases)('should resolve %s like the deployed viewer function', async (path, routeKey, params = {}) => {
		const expected = routeKey ? { routeKey, params } : undefined

		expect(resolveLocal(path)).toEqual(expected)
		await expect(resolveDeployed(path)).resolves.toEqual(expected)
	})

	it('should return nothing without a catch-all route', () => {
		const match = compileRoutes(devRoutes.filter(route => route.pattern !== '/*'))

		expect(match('/unknown/path')).toBeUndefined()
		expect(match('/manifest.json')).toBeUndefined()
		expect(match('/about')).toMatchObject({ routeKey: 'stack:/about' })
	})

	it('should carry the proxy target & rewrite of a route', () => {
		const match = compileRoutes([
			{ routerId: 'main', pattern: '/site/*', proxy: 'http://127.0.0.1:5173', rewrite: { regex: '^/site', to: '' } },
		])

		expect(match('/site/index.html')).toEqual({
			routeKey: undefined,
			proxy: 'http://127.0.0.1:5173',
			params: {},
			rewrite: { regex: '^/site', to: '' },
		})
	})
})
