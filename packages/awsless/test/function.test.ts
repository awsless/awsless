import { invoke } from '@awsless/lambda'
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
