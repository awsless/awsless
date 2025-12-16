import { z } from 'zod'
import { DurationSchema } from '../old/config/schema/duration.js'
import {
	CronExpression,
	CronExpressionSchema,
	RateExpression,
	RateExpressionSchema,
	ScheduleExpression,
	ScheduleExpressionSchema,
} from '../old/feature/cron/schema/schedule.js'
import { Duration } from '../old/formation/property/duration.js'
import { SizeSchema } from '../old/config/schema/size.js'
import { Size } from '../old/formation/property/size.js'

describe('schema', () => {
	it('size', () => {
		expectTypeOf<z.input<typeof SizeSchema>>().toEqualTypeOf<string>()
		expectTypeOf<z.output<typeof SizeSchema>>().toEqualTypeOf<Size>()

		SizeSchema.parse('1 KB')
		SizeSchema.parse('2 MB')
		SizeSchema.parse('3 GB')

		expect(() => SizeSchema.parse('1 KBB')).toThrow()
		expect(() => SizeSchema.parse('KB')).toThrow()
		expect(() => SizeSchema.parse('1')).toThrow()
		expect(() => SizeSchema.parse('')).toThrow()
	})

	it('duration', () => {
		expectTypeOf<z.input<typeof DurationSchema>>().toEqualTypeOf<string>()
		expectTypeOf<z.output<typeof DurationSchema>>().toEqualTypeOf<Duration>()

		DurationSchema.parse('1 minute')
		DurationSchema.parse('99 minutes')
		DurationSchema.parse('1 hour')

		expect(() => DurationSchema.parse('1 hourss')).toThrow()
		expect(() => DurationSchema.parse('hour')).toThrow()
		expect(() => DurationSchema.parse('1')).toThrow()
		expect(() => DurationSchema.parse('')).toThrow()
	})

	it('rate expression', () => {
		expectTypeOf<z.input<typeof RateExpressionSchema>>().toEqualTypeOf<RateExpression>()
		expectTypeOf<z.output<typeof RateExpressionSchema>>().toEqualTypeOf<string>()

		RateExpressionSchema.parse('1 minute')
		RateExpressionSchema.parse('99 minutes')
		RateExpressionSchema.parse('1 hour')

		expect(() => RateExpressionSchema.parse('rate(0 hour)')).toThrow()
		expect(() => RateExpressionSchema.parse('rate(hour)')).toThrow()
		expect(() => RateExpressionSchema.parse('rate(1)')).toThrow()
		expect(() => RateExpressionSchema.parse('1 hourss')).toThrow()
		expect(() => RateExpressionSchema.parse('0 hour')).toThrow()
		expect(() => RateExpressionSchema.parse('hour')).toThrow()
		expect(() => RateExpressionSchema.parse('1')).toThrow()
		expect(() => RateExpressionSchema.parse('')).toThrow()
	})

	it('cron expression', () => {
		expectTypeOf<z.input<typeof CronExpressionSchema>>().toEqualTypeOf<CronExpression>()
		expectTypeOf<z.output<typeof CronExpressionSchema>>().toEqualTypeOf<string>()

		CronExpressionSchema.parse('* * * * ? *')
		CronExpressionSchema.parse('5 * * * ? *')
		CronExpressionSchema.parse('5,10 * * * ? *')

		expect(() => CronExpressionSchema.parse('')).toThrow()
		expect(() => CronExpressionSchema.parse('cron()')).toThrow()
		expect(() => CronExpressionSchema.parse('* * * * *')).toThrow()
		expect(() => CronExpressionSchema.parse('f * * * * *')).toThrow()
		expect(() => CronExpressionSchema.parse('60 * * * * *')).toThrow()
	})

	it('schedule expression', () => {
		expectTypeOf<z.input<typeof ScheduleExpressionSchema>>().toEqualTypeOf<ScheduleExpression>()
		expectTypeOf<z.output<typeof ScheduleExpressionSchema>>().toEqualTypeOf<string>()

		ScheduleExpressionSchema.parse('1 hour')
		ScheduleExpressionSchema.parse('* * * * ? *')

		expect(() => ScheduleExpressionSchema.parse('1 hourss')).toThrow()
	})
})
