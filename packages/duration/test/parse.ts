import {
	Duration,
	DurationFormat,
	parse,
	toDays,
	toHours,
	toMilliSeconds,
	toMinutes,
	toSeconds,
	toWeeks,
	toYears,
} from '../src'

describe('Duration Parser', () => {
	it('parse', () => {
		const result = parse('1 millisecond')
		expect(toMilliSeconds(result)).toBe(1)
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
		const list: [DurationFormat, (value: Duration) => number, number][] = [
			['1 milliseconds', toMilliSeconds, 1],
			['1 millisecond', toMilliSeconds, 1],
			['1 seconds', toSeconds, 1],
			['1 second', toSeconds, 1],
			['1 minutes', toMinutes, 1],
			['1 minute', toMinutes, 1],
			['1 hours', toHours, 1],
			['1 hour', toHours, 1],
			['1 days', toDays, 1],
			['1 day', toDays, 1],
			['1 weeks', toWeeks, 1],
			['1 week', toWeeks, 1],
			['1 years', toYears, 1],
			['1 year', toYears, 1],

			['999 day', toDays, 999],
		]

		for (const [string, transform, expectation] of list) {
			it(string, () => {
				const result = parse(string)
				expect(transform(result)).toBe(expectation)
			})
		}
	})
})
