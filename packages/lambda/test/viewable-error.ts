import { getViewableErrorData, isViewableError, isViewableErrorType, ViewableError } from '../src'

describe('ViewableError', () => {
	it('should support instanceof', () => {
		const error = new ViewableError('type', 'message', { foo: 'bar' })
		expect(error).instanceOf(ViewableError)
		expect(error).instanceOf(Error)
		expect(error.type).toBe('type')
		expect(error.data).toStrictEqual({ foo: 'bar' })
	})

	it('should know if an error is viewable', () => {
		const error1 = new ViewableError('type', 'message')
		const error2 = new Error(error1.message)
		const error3 = new Error('message')

		expect(isViewableError(error1)).toBe(true)
		expect(isViewableError(error2)).toBe(true)
		expect(isViewableError(error3)).toBe(false)
	})

	it('should know what error type is', () => {
		const error = new ViewableError('one', 'message')

		expect(isViewableErrorType(error, 'one')).toBe(true)
		expect(isViewableErrorType(error, 'two')).toBe(false)
	})

	it('should get viewable error data', () => {
		const error1 = new ViewableError('type', 'message')
		const error2 = new ViewableError('type', 'message', { foo: 'bar' })

		expect(getViewableErrorData(error1)).toStrictEqual({
			type: 'type',
			message: 'message',
		})

		expect(getViewableErrorData(error2)).toStrictEqual({
			type: 'type',
			message: 'message',
			data: {
				foo: 'bar',
			},
		})
	})
})
