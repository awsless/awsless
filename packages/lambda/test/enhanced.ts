import { describe, expect, it } from 'vitest'
import { enhanceError } from '../src/errors/enhanced'

describe('enhanceError', () => {
	it('keeps the identity of the cause', () => {
		const cause = new TypeError('send is not a function')
		const error = enhanceError(cause, undefined, { id: 1 })

		expect(error.name).toBe('TypeError')
		expect(error.stack).toBe(cause.stack)
		expect(error.cause).toBe(cause)
		expect(error.input).toStrictEqual({ id: 1 })
	})

	it('never leaks name & stack into the serialized record', () => {
		const error = enhanceError(new TypeError('boom'), undefined, {})

		// The log serializer spreads own enumerable props into the error
		// record - name & stack must stay out of it, like on a native error.
		expect(Object.keys(error)).not.toContain('name')
		expect(Object.keys(error)).not.toContain('stack')
	})
})
