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
	toSafeDays,
	toSafeHours,
	toSafeMilliSeconds,
	toSafeMinutes,
	toSafeSeconds,
	toSafeWeeks,
	toSafeYears,
	toSeconds,
	toWeeks,
	toYears,
	weeks,
	years,
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

		it('years', () => {
			const result = years(1)
			expect(result.value).toBe(1000n * 60n * 60n * 24n * 365n)
			expectTypeOf(result).toEqualTypeOf<Duration>()
		})
	})

	describe('transform', () => {
		const value = years(1)

		it('milliseconds', () => {
			const result = toMilliSeconds(value)
			expect(result).toBe(1000 * 60 * 60 * 24 * 365)
		})

		it('seconds', () => {
			const result = toSeconds(value)
			expect(result).toBe(60 * 60 * 24 * 365)
		})

		it('minutes', () => {
			const result = toMinutes(value)
			expect(result).toBe(60 * 24 * 365)
		})

		it('hours', () => {
			const result = toHours(value)
			expect(result).toBe(24 * 365)
		})

		it('days', () => {
			const result = toDays(value)
			expect(result).toBe(365)
		})

		it('weeks', () => {
			const result = toWeeks(value)
			expect(result).toBe(52)
		})

		it('years', () => {
			const result = toYears(value)
			expect(result).toBe(1)
		})
	})

	describe('safe transform', () => {
		const value = years(1)

		it('milliseconds', () => {
			const result = toSafeMilliSeconds(value)
			expect(result).toBe(1000n * 60n * 60n * 24n * 365n)
		})

		it('seconds', () => {
			const result = toSafeSeconds(value)
			expect(result).toBe(60n * 60n * 24n * 365n)
		})

		it('minutes', () => {
			const result = toSafeMinutes(value)
			expect(result).toBe(60n * 24n * 365n)
		})

		it('hours', () => {
			const result = toSafeHours(value)
			expect(result).toBe(24n * 365n)
		})

		it('days', () => {
			const result = toSafeDays(value)
			expect(result).toBe(365n)
		})

		it('weeks', () => {
			const result = toSafeWeeks(value)
			expect(result).toBe(52n)
		})

		it('years', () => {
			const result = toSafeYears(value)
			expect(result).toBe(1n)
		})
	})
})
