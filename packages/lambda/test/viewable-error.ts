import { isViewableErrorResponse, toViewableErrorResponse, ViewableError } from '../src'

describe('ViewableError', () => {
	it('should support instanceof', () => {
		const error = new ViewableError('type', 'message', { foo: 'bar' })
		expect(error).instanceOf(ViewableError)
		expect(error).instanceOf(Error)
		expect(error.type).toBe('type')
		expect(error.data).toStrictEqual({ foo: 'bar' })
	})

	it('should know convert to error response', () => {
		const error = new ViewableError('type', 'message', { foo: 'bar' })

		expect(toViewableErrorResponse(error)).toStrictEqual({
			__error__: {
				type: 'type',
				data: { foo: 'bar' },
				message: 'message',
			},
		})
	})

	it('should succeed check error response', () => {
		const response = {
			__error__: {
				type: 'type',
				data: { foo: 'bar' },
				message: 'message',
			},
		}

		expect(isViewableErrorResponse(response)).toBe(true)
	})

	it('should fail check error response', () => {
		const response = {
			__unknown__: {},
		}

		expect(isViewableErrorResponse(response)).toBe(false)
	})
})
