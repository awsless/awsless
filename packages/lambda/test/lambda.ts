
import { string, StructError } from '@heat/validate'
import { describe, it, expect, vi } from 'vitest'
import { lambda, ValidationError, ViewableError } from '../src'

describe('Lambda', () => {

	it('should echo', async () => {
		const echo = lambda({ handle: (input) => input })
		const result = await echo('echo')
		expect(result).toBe('echo')
	})

	it('should noop', async () => {
		const noop = lambda({ handle: () => {} })
		const result = await noop('echo')
		expect(result).toBeUndefined()
	})

	it('should throw correctly', async () => {
		const error = new Error()
		const handle = lambda({ handle: () => { throw error } })

		await expect(handle()).rejects.toThrow(error)
	})

	it('should allow deep middleware handlers', async () => {
		const handle = lambda({
			handle: () => 'works'
		})

		const result = await handle()
		expect(result).toBe('works')
	})

	it('should validate input', async () => {
		const handle = lambda({
			input: string(),
			handle() {}
		})

		await handle('hi')

		// @ts-ignore
		await expect(handle()).rejects.toThrow(ValidationError)
	})

	it('should validate output', async () => {
		const handle = lambda({
			output: string(),
			handle(input) {
				return input as string
			}
		})

		await handle('hi')
		await expect(handle()).rejects.toThrow(StructError)
	})

	it('should validate input & output', async () => {
		const handle = lambda({
			input: string(),
			output: string(),
			handle(input) {
				return input
			}
		})

		const result = await handle('hi')
		expect(result).toBe('hi')
	})

	it('should log errors', async () => {
		const logger = vi.fn()
		const error = new Error()
		const fn = lambda({
			logger,
			handle() {
				throw error
			}
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
			}
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
			}
		})

		await expect(fn).rejects.toThrow(error)
		expect(logger).toBeCalledTimes(1)
	})
})
