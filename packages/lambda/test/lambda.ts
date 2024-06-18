import { string } from '@awsless/validate'
import { Context } from 'aws-lambda'
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

	it('should infer the function type correctly', () => {
		const f1 = lambda({ handle: () => {} })
		const f2 = lambda({ handle: _ => {} })
		const f3 = lambda({ schema: string(), handle: () => {} })
		const f4 = lambda({ schema: string(), handle: value => value })
		const f5 = lambda({ handle: () => (true ? '1' : undefined) })
		const f6 = lambda({ handle: () => new Date() })
		const f7 = lambda({ handle: () => [1, undefined] })

		type e1 = (event?: unknown, context?: Context | undefined) => Promise<void>
		type e2 = (event?: unknown, context?: Context | undefined) => Promise<void>
		type e3 = (event: string, context?: Context | undefined) => Promise<void>
		type e4 = (event: string, context?: Context | undefined) => Promise<string>
		type e5 = (event?: unknown, context?: Context | undefined) => Promise<'1' | undefined>
		type e6 = (event?: unknown, context?: Context | undefined) => Promise<string>
		type e7 = (event?: unknown, context?: Context | undefined) => Promise<Array<number | null>>

		expectTypeOf(f1).toEqualTypeOf<e1>()
		expectTypeOf(f2).toEqualTypeOf<e2>()
		expectTypeOf(f3).toEqualTypeOf<e3>()
		expectTypeOf(f4).toEqualTypeOf<e4>()
		expectTypeOf(f5).toEqualTypeOf<e5>()
		expectTypeOf(f6).toEqualTypeOf<e6>()
		expectTypeOf(f7).toEqualTypeOf<e7>()

		// type L = LambdaFunction<() => void>

		// expectTypeOf<e1>().toEqualTypeOf<typeof f1>()
		// expectTypeOf<e2>().toEqualTypeOf<typeof f2>()
		// expectTypeOf<e3>().toEqualTypeOf<typeof f3>()
		// expectTypeOf<e4>().toEqualTypeOf<typeof f4>()
	})
})
