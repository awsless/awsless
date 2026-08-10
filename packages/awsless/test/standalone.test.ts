import { invoke } from '@awsless/lambda'

vi.mock('@awsless/lambda', () => ({
	invoke: vi.fn(async ({ payload }) => payload),
}))

describe('standalone routes', () => {
	// The bundle name derives from the APP env, which some tests read
	// after unstubbing - a real value keeps every call valid.
	beforeAll(() => {
		process.env.APP = 'app'
	})

	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
		vi.mocked(invoke).mockClear()
	})

	it('detects the stand-alone flag in the route env', async () => {
		const { isStandaloneRoute } = await import('../src/lib/server/bundle')

		expect(isStandaloneRoute('stack:function:echo')).toBe(false)

		vi.stubEnv('stack:function:echo:STANDALONE', 'true')

		expect(isStandaloneRoute('stack:function:echo')).toBe(true)
	})

	it('invokes stand-alone functions directly by name', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('APP', 'app')
		vi.stubEnv('stack:function:echo:STANDALONE', 'true')

		const { Fn } = await import('../src/lib/server/function')

		await (Fn as any).stack.echo({ n: 1 })

		expect(invoke).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'app--stack--function--echo',
				payload: { n: 1 },
			})
		)
		expect(vi.mocked(invoke).mock.calls[0]![0]).not.toHaveProperty('qualifier')
	})

	it('routes calls without the stand-alone flag through the bundle', async () => {
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

	it('never leaks the version of a stand-alone lambda into the bundle qualifier', async () => {
		const { invokeBundle } = await import('../src/lib/server/bundle')

		vi.stubEnv('STANDALONE', 'true')
		vi.stubEnv('AWS_LAMBDA_FUNCTION_VERSION', '$LATEST')
		await invokeBundle({ routeKey: 'stack:function:echo' })

		expect(invoke).toHaveBeenLastCalledWith(expect.objectContaining({ qualifier: 'live' }))
	})

	it('routes sandboxed calls through the sandbox proxy', async () => {
		const { invokeBundle } = await import('../src/lib/server/bundle')

		vi.stubEnv('SANDBOX_PROXY', 'app--stack--function--echo-proxy')
		vi.stubEnv('AWS_LAMBDA_FUNCTION_VERSION', '$LATEST')
		await invokeBundle({ routeKey: 'stack:function:echo', payload: { n: 1 } })

		expect(invoke).toHaveBeenLastCalledWith(
			expect.objectContaining({
				name: 'app--stack--function--echo-proxy',
				payload: { '$awsless-route': 'stack:function:echo', event: { n: 1 } },
			})
		)
		expect(vi.mocked(invoke).mock.calls.at(-1)![0]).not.toHaveProperty('qualifier')
	})

	it('pins the bundle qualifier to the running version inside the bundle', async () => {
		const { invokeBundle } = await import('../src/lib/server/bundle')

		vi.stubEnv('STANDALONE', 'false')
		vi.stubEnv('AWS_LAMBDA_FUNCTION_VERSION', '42')
		await invokeBundle({ routeKey: 'stack:function:echo' })

		expect(invoke).toHaveBeenLastCalledWith(expect.objectContaining({ qualifier: '42' }))

		vi.unstubAllEnvs()
		await invokeBundle({ routeKey: 'stack:function:echo' })

		expect(invoke).toHaveBeenLastCalledWith(expect.objectContaining({ qualifier: 'live' }))
	})
})
