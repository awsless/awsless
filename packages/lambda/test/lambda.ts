import { lambda, ViewableError } from '../src'

describe('Lambda', () => {
	it('should echo', async () => {
		const echo = lambda({ handle: input => input })
		const result = await echo('echo')

		expectTypeOf(result).toBeUnknown()
		expect(result).toBe('echo')
	})

	it('should noop', async () => {
		const noop = lambda({ handle: () => {} })
		const result = await noop('echo')

		expectTypeOf(result).toBeVoid()
		expect(result).toBeUndefined()
	})

	it('should throw correctly', async () => {
		const error = new Error()
		const handle = lambda({
			handle: () => {
				throw error
			},
		})

		await expect(handle()).rejects.toThrow(error)
	})

	it('should response correctly', async () => {
		const handle = lambda({
			handle: () => 'works',
		})

		const result = await handle()

		expectTypeOf(result).toBeString()
		expect(result).toBe('works')
	})

	it('should log errors', async () => {
		const logger = vi.fn()
		const error = new Error()
		const fn = lambda({
			logger,
			handle() {
				throw error
			},
		})

		await expect(fn).rejects.toThrow(error)
		expect(logger).toBeCalledTimes(1)
	})

	it('should ignore viewable errors', async () => {
		const logger = vi.fn()
		const error = new ViewableError('type', 'message')
		const fn = lambda({
			logger,
			handle() {
				throw error
			},
		})

		await expect(fn).rejects.toThrow(error)
		expect(logger).toBeCalledTimes(0)
	})

	it('should NOT ignore viewable errors', async () => {
		const logger = vi.fn()
		const error = new ViewableError('type', 'message')
		const fn = lambda({
			logViewableErrors: true,
			logger,
			handle() {
				throw error
			},
		})

		await expect(fn).rejects.toThrow(error)
		expect(logger).toBeCalledTimes(1)
	})
})
