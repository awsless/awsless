import { ExpectedError, invoke } from '@awsless/lambda'
import { setBundleRoutes, withBundleRouteContext } from '../src/lib/server/bundle'
import { Fn } from '../src/lib/server/function'

vi.mock('@awsless/lambda', async importOriginal => ({
	...(await importOriginal<typeof import('@awsless/lambda')>()),
	invoke: vi.fn(async ({ payload }) => payload),
}))

describe('function', () => {
	const func = (Fn as any).stack.echo

	beforeEach(() => {
		vi.mocked(invoke).mockClear()
	})

	it('does not cache normal calls', async () => {
		await func({ id: 'normal' })
		await func({ id: 'normal' })

		expect(invoke).toHaveBeenCalledTimes(2)
	})

	it('shares the cache between both cache APIs', async () => {
		const first = func({ id: 'cached' }, { cache: true })
		const second = func.cached({ id: 'cached' })

		expect(first).toBe(second)
		await first
		expect(invoke).toHaveBeenCalledTimes(1)
	})

	it('uses the payload and qualifier in the cache key', async () => {
		await func.cached({ id: 'first' })
		await func.cached({ id: 'second' })
		await func.cached({ id: 'first' }, { qualifier: 'other' })

		expect(invoke).toHaveBeenCalledTimes(3)
	})
})

describe('function inside the bundle', () => {
	const func = (Fn as any).stack.bundled

	beforeEach(() => {
		vi.stubEnv('LAMBDA_ENV', 'production')
		vi.stubEnv('APP', 'app')
		vi.mocked(invoke).mockClear()
		setBundleRoutes(['stack:function:bundled'])
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		setBundleRoutes([])
	})

	it('dispatches bundled routes in-process', async () => {
		const dispatch = vi.fn(async (_routeKey: string, payload: unknown) => ({ echo: payload }))

		const result = await withBundleRouteContext('stack:function:caller', dispatch, () => func({ n: 1 }))

		expect(result).toStrictEqual({ echo: { n: 1 } })
		expect(dispatch).toHaveBeenCalledWith('stack:function:bundled', { n: 1 })
		expect(invoke).not.toHaveBeenCalled()
	})

	it('invokes the bundle for a qualifier or a custom client', async () => {
		const dispatch = vi.fn(async () => undefined)

		await withBundleRouteContext('stack:function:caller', dispatch, () => func({ n: 1 }, { qualifier: 'main-1' }))

		expect(dispatch).not.toHaveBeenCalled()
		expect(invoke).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'app--function--bundle', qualifier: 'main-1' })
		)
	})

	it('flattens expected errors when they are not reflected', async () => {
		const dispatch = vi.fn(async () => {
			throw new ExpectedError('nope', 'Expected failure')
		})

		const reflected = withBundleRouteContext('stack:function:caller', dispatch, () => func({}))
		await expect(reflected).rejects.toBeInstanceOf(ExpectedError)

		const flattened = withBundleRouteContext('stack:function:caller', dispatch, () =>
			func({}, { reflectViewableErrors: false })
		)
		await expect(flattened).rejects.toThrow('Expected failure')
		await expect(flattened).rejects.not.toBeInstanceOf(ExpectedError)
	})
})
