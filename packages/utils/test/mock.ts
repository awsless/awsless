import { expectTypeOf } from 'vitest'
import { getVitest, mockFn, mockObjectValues, nextTick } from '../src'

describe('Mock', () => {
	const echo = (a: string) => a

	it('mockObjectValues', () => {
		const result = mockObjectValues({ echo })

		expect(result.echo('hi')).toBe('hi')
		expect(result.echo).toBeCalledTimes(1)
	})

	it('mockFn', () => {
		const result = mockFn(echo)

		expect(result('hi')).toBe('hi')
		expect(result).toBeCalledTimes(1)
	})

	it('nextTick', async () => {
		const result = await nextTick(echo, 'hi')
		expect(result).toBe('hi')
	})

	it('uses an explicit mock factory without vitest globals', () => {
		const vitest = vi
		const globals = globalThis as { vi?: typeof vi }
		delete globals.vi

		try {
			expect(getVitest(vitest)).toBe(vitest)
			const fn = mockFn(echo, vitest.fn)
			const mocks = mockObjectValues({ echo, double: (value: number) => value * 2 }, vitest.fn)

			expect(fn('hi')).toBe('hi')
			expect(fn).toHaveBeenCalledWith('hi')
			expect(mocks.double(3)).toBe(6)
			expect(mocks.double).toHaveBeenCalledWith(3)
			expect(Object.isFrozen(mocks)).toBe(true)
			expectTypeOf(mocks.echo).parameters.toEqualTypeOf<[string]>()
			expectTypeOf(mocks.double).returns.toEqualTypeOf<number>()
			expect(() => getVitest()).toThrow('vitest globals')
			expect(() => mockFn(echo)).toThrow('vitest globals')
			expect(() => mockObjectValues({ echo })).toThrow('vitest globals')
		} finally {
			globals.vi = vitest
		}
	})

	it('rejects when a deferred handler throws', async () => {
		const error = new Error('handler failed')
		await expect(
			nextTick(() => {
				throw error
			})
		).rejects.toBe(error)
	})

	it('awaits a deferred async handler and propagates its rejection', async () => {
		await expect(nextTick(async () => 'ok')).resolves.toBe('ok')
		const error = new Error('async handler failed')
		await expect(
			nextTick(async () => {
				throw error
			})
		).rejects.toBe(error)
	})

	it('should work with complex functions', async () => {
		const complex = (a: object, b: object[]) => [a, ...b]

		mockObjectValues({ complex })
		mockFn(complex)

		await nextTick(complex, 'hi', ['world'])
	})
})
