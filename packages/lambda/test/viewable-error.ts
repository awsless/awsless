import { isErrorResponse, toErrorResponse, ViewableError } from '../src'

describe('error', () => {
	describe('Viewable Error', () => {
		it('should support instanceof', () => {
			const error = new ViewableError('type', 'message', { foo: 'bar' })
			expect(error).instanceOf(ViewableError)
			expect(error).instanceOf(Error)
			expect(error.type).toBe('type')
			expect(error.data).toStrictEqual({ foo: 'bar' })
		})
	})

	it('should know convert to error response', () => {
		const error = new ViewableError('type', 'message', { foo: 'bar' })

		expect(toErrorResponse(error)).toStrictEqual({
			__error__: {
				type: 'type',
				message: 'message',
			},
		})
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
