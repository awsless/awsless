import {
	Duration,
	days,
	hours,
	milliSeconds,
	minutes,
	seconds,
	toDays,
	toHours,
	toMilliSeconds,
	toMinutes,
	toSeconds,
	toWeeks,
	weeks,
} from '../src'

describe('Duration', () => {
	describe('factory', () => {
		it('milliseconds', () => {
			const result = milliSeconds(1)
			expect(result.value).toBe(1n)
			expectTypeOf(result).toEqualTypeOf<Duration>()
		})

		it('seconds', () => {
			const result = seconds(1)
			expect(result.value).toBe(1000n)
			expectTypeOf(result).toEqualTypeOf<Duration>()
		})

		it('minutes', () => {
			const result = minutes(1)
			expect(result.value).toBe(1000n * 60n)
			expectTypeOf(result).toEqualTypeOf<Duration>()
		})

		it('hours', () => {
			const result = hours(1)
			expect(result.value).toBe(1000n * 60n * 60n)
			expectTypeOf(result).toEqualTypeOf<Duration>()
		})

		it('days', () => {
			const result = days(1)
			expect(result.value).toBe(1000n * 60n * 60n * 24n)
			expectTypeOf(result).toEqualTypeOf<Duration>()
		})

		it('weeks', () => {
			const result = weeks(1)
			expect(result.value).toBe(1000n * 60n * 60n * 24n * 7n)
			expectTypeOf(result).toEqualTypeOf<Duration>()
		})
	})

	describe('transform', () => {
		const value = weeks(1)

		it('milliseconds', () => {
			const result = toMilliSeconds(value)
			expect(result).toBe(1000n * 60n * 60n * 24n * 7n)
		})

		it('seconds', () => {
			const result = toSeconds(value)
			expect(result).toBe(60n * 60n * 24n * 7n)
		})

		it('minutes', () => {
			const result = toMinutes(value)
			expect(result).toBe(60n * 24n * 7n)
		})

		it('hours', () => {
			const result = toHours(value)
			expect(result).toBe(24n * 7n)
		})

		it('days', () => {
			const result = toDays(value)
			expect(result).toBe(7n)
		})

		it('weeks', () => {
			const result = toWeeks(value)
			expect(result).toBe(1n)
		})
	})
})
