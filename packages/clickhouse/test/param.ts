import { quoteIdentifier, quoteString } from '../src'

describe('quoting', () => {
	it('quotes identifiers', () => {
		expect(quoteIdentifier('stack--events')).toBe('`stack--events`')
		expect(quoteIdentifier('a`b')).toBe('`a\\`b`')
	})

	it('quotes string literals', () => {
		expect(quoteString("it's\ta\\b\nc")).toBe("'it\\'s\\ta\\\\b\\nc'")
	})
})
