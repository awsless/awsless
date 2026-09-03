import { ExpectedError, isErrorResponse } from '@awsless/lambda'
import { consumer } from '../src/lib/handle/util'
import { withBundleRouteContext } from '../src/lib/server/bundle'

const noInvoke = async () => undefined

describe('consumer', () => {
	beforeEach(() => {
		vi.stubEnv('LAMBDA_ENV', 'production')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	const failing = consumer(undefined, () => {
		throw new ExpectedError('nope', 'Expected failure')
	})

	it('responds with expected errors outside the bundle', async () => {
		const result = await failing({})

		expect(isErrorResponse(result)).toBe(true)
	})

	it('responds with expected errors on sync routes', async () => {
		const result = await withBundleRouteContext('stack:function:echo', noInvoke, () => failing({}))

		expect(result).toMatchObject({ __error__: { type: 'nope', message: 'Expected failure' } })
	})

	it('throws expected errors on async routes', async () => {
		await expect(
			withBundleRouteContext('stack:queue:jobs', noInvoke, () => failing({}), { throwExpectedErrors: true })
		).rejects.toThrow('Expected failure')
	})

	it('decides per concurrent invocation', async () => {
		let release!: () => void
		const gate = new Promise<void>(resolve => {
			release = resolve
		})

		const gated = consumer(undefined, async () => {
			await gate
			throw new ExpectedError('nope', 'Expected failure')
		})

		const sync = withBundleRouteContext('stack:function:echo', noInvoke, () => gated({}))
		const async = withBundleRouteContext('stack:queue:jobs', noInvoke, () => gated({}), {
			throwExpectedErrors: true,
		})

		release()

		await expect(sync).resolves.toMatchObject({ __error__: { type: 'nope' } })
		await expect(async).rejects.toThrow('Expected failure')
	})
})
