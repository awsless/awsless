import { ExpectedError, isErrorResponse, toErrorResponse } from '../src'

describe('error', () => {
	describe('Expected Error', () => {
		it('should support instanceof', () => {
			const error = new ExpectedError('type', 'message', { foo: 'bar' })
			expect(error).instanceOf(ExpectedError)
			expect(error).instanceOf(Error)
			expect(error.type).toBe('type')
			expect(error.data).toStrictEqual({ foo: 'bar' })
		})
	})

	it('should know convert to error response', () => {
		const error = new ExpectedError('type', 'message', { foo: 'bar' })

		expect(toErrorResponse(error)).toStrictEqual({
			__error__: {
				type: 'type',
				message: 'message',
				data: { foo: 'bar' },
			},
		})
	})

	it('should unpatch the error data', () => {
		const error = new ExpectedError('type', 'message', { id: 1n, at: new Date(0) })
		const response = toErrorResponse(error)

		expect(response.__error__.data).toStrictEqual({
			id: { $bigint: '1' },
			at: { $date: '1970-01-01T00:00:00.000Z' },
		})
		expect(() => JSON.stringify(response)).not.toThrow()
	})

	it('should succeed check error response', () => {
		const response = {
			__error__: {
				type: 'type',
				message: 'message',
			},
		}

		expect(isErrorResponse(response)).toBe(true)
	})

	it('should fail check error response', () => {
		const response = {
			__unknown__: {},
		}

		expect(isErrorResponse(response)).toBe(false)
	})
})
