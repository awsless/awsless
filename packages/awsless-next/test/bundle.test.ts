import { formatRouteKey, getRouteEnv, internalInvoke, withBundleRoute } from '../src/lib/server/bundle'

describe('bundle routes', () => {
	afterEach(() => {
		delete process.env['stack:function:echo:TABLE']
		delete process.env.TABLE
	})

	it('should format route keys as kebab-case', () => {
		expect(formatRouteKey('MyStack', 'function', 'HelloWorld')).toBe('my-stack:function:hello-world')
	})

	it('should scope env lookups to the running route', () => {
		process.env['stack:function:echo:TABLE'] = 'scoped'
		process.env.TABLE = 'plain'

		expect(getRouteEnv('TABLE')).toBe('plain')
		expect(withBundleRoute('stack:function:echo', async () => undefined, () => getRouteEnv('TABLE'))).toBe('scoped')
	})

	it('should only invoke routes inside the bundle', async () => {
		expect(() => internalInvoke('stack:function:echo', {})).toThrow('inside the bundle')

		const result = await withBundleRoute(
			'caller',
			async (routeKey, payload) => ({ routeKey, payload }),
			() => internalInvoke('stack:function:echo', { n: 1 })
		)

		expect(result).toEqual({ routeKey: 'stack:function:echo', payload: { n: 1 } })
	})
})
