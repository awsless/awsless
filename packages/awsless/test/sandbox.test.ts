import { internalInvoke, withBundleRouteContext } from '../src/lib/server/bundle'
import { getConfigValue, setConfigValue } from '../src/lib/server/config'

describe('dev sandbox', () => {
	const invoke = vi.fn(async () => 'answer')
	const asRoute = <T>(route: string, callback: () => T) => withBundleRouteContext(route, invoke, callback)

	beforeAll(() => {
		vi.stubEnv(
			'AWSLESS_DEV_SANDBOX',
			JSON.stringify({
				'shop:function:limited': { routes: ['shop:function:open'], configs: ['api-key'], services: [] },
			})
		)

		setConfigValue('API_KEY', 'key')
		setConfigValue('OTHER', 'other')
	})

	afterAll(() => {
		vi.unstubAllEnvs()
	})

	it('refuses a route off the allowlist like the sandbox proxy', () => {
		expect(() => asRoute('shop:function:limited', () => internalInvoke('shop:function:secret', {}))).toThrow(
			'Sandboxed route is not allowed: shop:function:secret'
		)
		expect(invoke).not.toHaveBeenCalled()
	})

	it('invokes an allowlisted route, and any route of a function without a sandbox', async () => {
		await expect(asRoute('shop:function:limited', () => internalInvoke('shop:function:open', {}))).resolves.toBe(
			'answer'
		)
		await expect(asRoute('shop:function:open', () => internalInvoke('shop:function:secret', {}))).resolves.toBe(
			'answer'
		)
	})

	it('hides a config off the allowlist', () => {
		expect(asRoute('shop:function:limited', () => getConfigValue('API_KEY'))).toBe('key')
		expect(() => asRoute('shop:function:limited', () => getConfigValue('OTHER'))).toThrow(
			`The "OTHER" config value hasn't been set yet`
		)
		expect(asRoute('shop:function:open', () => getConfigValue('OTHER'))).toBe('other')
	})
})
