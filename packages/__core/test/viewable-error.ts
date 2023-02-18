
import { describe, it, expect } from 'vitest'
import { getViewableErrorData, isViewableError, ViewableError } from '../src'

describe('ViewableError', () => {

	it('should support instanceof', () => {
		const error = new ViewableError('type', 'message')
		expect(error).instanceOf(ViewableError)
		expect(error).instanceOf(Error)
	})

	it('should know if an error is viewable', () => {
		const error1 = new ViewableError('type', 'message')
		const error2 = new Error(error1.message)
		const error3 = new Error('message')

		expect(isViewableError(error1)).toBe(true)
		expect(isViewableError(error2)).toBe(true)
		expect(isViewableError(error3)).toBe(false)
	})

	it('should get viewable error data', () => {
		const error1 = new ViewableError('type', 'message')
		const error2 = new ViewableError('type', 'message', { foo: 'bar' })

		expect(getViewableErrorData(error1)).toStrictEqual({
			type: 'type',
			message: 'message'
		})

		expect(getViewableErrorData(error2)).toStrictEqual({
			type: 'type',
			message: 'message',
			data: {
				foo: 'bar'
			}
		})
	})
})
