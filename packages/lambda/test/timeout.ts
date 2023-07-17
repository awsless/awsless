
import { lambda } from '../src'
import { Context } from 'aws-lambda'

describe('Timeout', () => {

	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
	const context = { getRemainingTimeInMillis: () => 100 + 1000 } as Context

	it('should log timeout error', async () => {
		const logger = vi.fn()
		const handle = lambda({
			logger,
			handle: () => sleep(1200)
		})

		await handle(undefined, context)

		expect(logger).toBeCalled()
	})

	it('should not log timeout error for in time error', async () => {
		const error = new Error()
		const logger = vi.fn()
		const handle = lambda({
			logger,
			async handle() {
				await sleep(50)
				throw error
			}
		})

		await expect(handle(undefined, context)).rejects.toThrow(error)
		await sleep(1100)

		expect(logger).toBeCalledTimes(1)
	})

	it('should not log timeout error for in time response', async () => {
		const logger = vi.fn()
		const handle = lambda({
			logger,
			async handle() {
				await sleep(50)
				return 'OK'
			}
		})

		const result = await handle(undefined, context)
		await sleep(1100)

		expect(result).toBe('OK')
		expect(logger).not.toBeCalled()
	})
})
