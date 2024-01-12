import { Duration, DurationFormat, parse, toDays, toHours, toMilliSeconds, toMinutes, toSeconds } from '../src'

describe('Duration Parser', () => {
	it('parse', () => {
		const result = parse('1 millisecond')
		expect(toMilliSeconds(result)).toBe(1n)
		expectTypeOf(result).toEqualTypeOf<Duration>()
	})

	it('invalid unit', () => {
		expect(() => {
			// @ts-ignore
			parse('1 milliseco')
		}).toThrow(SyntaxError)
	})

	it('invalid number', () => {
		expect(() => {
			// @ts-ignore
			parse('a seconds')
		}).toThrow(SyntaxError)
	})

	it('invalid precision', () => {
		expect(() => {
			parse('1.1 seconds')
		}).toThrow(SyntaxError)
	})

	describe('types', () => {
		const list: [DurationFormat, (value: Duration) => bigint, bigint][] = [
			['1 milliseconds', toMilliSeconds, 1n],
			['1 millisecond', toMilliSeconds, 1n],
			['1 seconds', toSeconds, 1n],
			['1 second', toSeconds, 1n],
			['1 minutes', toMinutes, 1n],
			['1 minute', toMinutes, 1n],
			['1 hours', toHours, 1n],
			['1 hour', toHours, 1n],
			['1 days', toDays, 1n],
			['1 day', toDays, 1n],
			['999 day', toDays, 999n],
		]

		for (const [string, transform, expectation] of list) {
			it(string, () => {
				const result = parse(string)
				expect(transform(result)).toBe(expectation)
			})
		}
	})
})
