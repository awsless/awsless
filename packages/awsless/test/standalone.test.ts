import { invoke } from '@awsless/lambda'

vi.mock('@awsless/lambda', () => ({
	invoke: vi.fn(async ({ payload }) => payload),
}))

describe('standalone routes', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
		vi.mocked(invoke).mockClear()
	})

	it('derives the stand-alone function name from the route key', async () => {
		vi.stubEnv('APP', 'app')

		const { getStandaloneFunctionName } = await import('../src/lib/server/bundle')

		expect(getStandaloneFunctionName('stack:function:echo')).toBe('app--stack--function--echo')
	})

	it('routes calls from outside the bundle through the bundle', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('APP', 'app')

		const { Fn } = await import('../src/lib/server/function')

		await (Fn as any).stack.echo({ n: 1 })

		expect(invoke).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'app--function--bundle',
				qualifier: 'live',
			})
		)
	})

	it('passes the invoked qualifier along to the bundle', async () => {
		vi.stubEnv('APP', 'app')

		const { captureInvokedQualifier, invokeBundle } = await import('../src/lib/server/bundle')

		captureInvokedQualifier({
			invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:app--stack--function--echo:main-8',
		})
		await invokeBundle({ routeKey: 'stack:function:other' })

		expect(invoke).toHaveBeenLastCalledWith(expect.objectContaining({ qualifier: 'main-8' }))
	})

	it('falls back to the live alias without an invoked qualifier', async () => {
		vi.stubEnv('APP', 'app')

		const { captureInvokedQualifier, invokeBundle } = await import('../src/lib/server/bundle')

		captureInvokedQualifier({
			invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:app--stack--function--echo',
		})
		await invokeBundle({ routeKey: 'stack:function:other' })

		expect(invoke).toHaveBeenLastCalledWith(expect.objectContaining({ qualifier: 'live' }))
	})

	it('invokes stand-alone routes directly inside the bundle', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('APP', 'app')

		const { captureInvokedQualifier, setBundleRoutes, withBundleRouteContext } = await import(
			'../src/lib/server/bundle'
		)
		const { Fn } = await import('../src/lib/server/function')

		captureInvokedQualifier({
			invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:app--function--bundle:main-8',
		})
		setBundleRoutes(['stack:function:bundled'])

		await withBundleRouteContext(
			'stack:function:bundled',
			async () => undefined,
			async () => {
				await (Fn as any).stack.echo({ n: 1 })
			}
		)

		expect(invoke).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'app--stack--function--echo',
				qualifier: 'main-8',
				payload: { n: 1 },
			})
		)
	})

	it('routes sandboxed calls through the sandbox proxy with the invoked qualifier', async () => {
		const { captureInvokedQualifier, invokeBundle } = await import('../src/lib/server/bundle')

		vi.stubEnv('SANDBOX_PROXY', 'app--stack--function--echo-proxy')
		captureInvokedQualifier({
			invokedFunctionArn: 'arn:aws:lambda:eu-west-1:123456789:function:app--stack--function--ssr:main-8',
		})
		await invokeBundle({ routeKey: 'stack:function:echo', payload: { n: 1 } })

		expect(invoke).toHaveBeenLastCalledWith(
			expect.objectContaining({
				name: 'app--stack--function--echo-proxy',
				qualifier: 'main-8',
				payload: { '$awsless-route': 'stack:function:echo', event: { n: 1 } },
			})
		)
	})
})
