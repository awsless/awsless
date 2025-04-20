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
			expect(result).toBe(1000 * 60 * 60 * 24 * 7)
		})

		it('seconds', () => {
			const result = toSeconds(value)
			expect(result).toBe(60 * 60 * 24 * 7)
		})

		it('minutes', () => {
			const result = toMinutes(value)
			expect(result).toBe(60 * 24 * 7)
		})

		it('hours', () => {
			const result = toHours(value)
			expect(result).toBe(24 * 7)
		})

		it('days', () => {
			const result = toDays(value)
			expect(result).toBe(7)
		})

		it('weeks', () => {
			const result = toWeeks(value)
			expect(result).toBe(1)
		})
	})

	describe('safe transform', () => {
		const value = weeks(1)

		it('milliseconds', () => {
			const result = toSafeMilliSeconds(value)
			expect(result).toBe(1000n * 60n * 60n * 24n * 7n)
		})

		it('seconds', () => {
			const result = toSafeSeconds(value)
			expect(result).toBe(60n * 60n * 24n * 7n)
		})

		it('minutes', () => {
			const result = toSafeMinutes(value)
			expect(result).toBe(60n * 24n * 7n)
		})

		it('hours', () => {
			const result = toSafeHours(value)
			expect(result).toBe(24n * 7n)
		})

		it('days', () => {
			const result = toSafeDays(value)
			expect(result).toBe(7n)
		})

		it('weeks', () => {
			const result = toSafeWeeks(value)
			expect(result).toBe(1n)
		})
	})
})
