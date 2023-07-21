import { z } from "zod";
import { Duration, DurationSchema } from "../src/schema/duration"
import { Duration as CDKDuration } from 'aws-cdk-lib/core'
import { CronExpression, CronExpressionSchema, RateExpression, RateExpressionSchema } from "../src/plugins/cron/schema/schedule";
import { Schedule } from "aws-cdk-lib/aws-events";

describe('schema', () => {
	it('duration', () => {
		expectTypeOf<z.input<typeof DurationSchema>>().toEqualTypeOf<Duration>()
		expectTypeOf<z.output<typeof DurationSchema>>().toEqualTypeOf<CDKDuration>()

		DurationSchema.parse('1 minute')
		DurationSchema.parse('99 minutes')
		DurationSchema.parse('1 hour')

		expect(() => DurationSchema.parse('hour')).toThrow()
		expect(() => DurationSchema.parse('1')).toThrow()
		expect(() => DurationSchema.parse('')).toThrow()
		// expect(() => DurationSchema.parse('0 hour')).toThrow()
	})

	it('rate expression', () => {
		expectTypeOf<z.input<typeof RateExpressionSchema>>().toEqualTypeOf<RateExpression>()
		expectTypeOf<z.output<typeof RateExpressionSchema>>().toEqualTypeOf<Schedule>()

		RateExpressionSchema.parse('rate(1 minute)')
		RateExpressionSchema.parse('rate(99 minutes)')
		RateExpressionSchema.parse('rate(1 hour)')

		expect(() => RateExpressionSchema.parse('rate(0 hour)')).toThrow()
		expect(() => RateExpressionSchema.parse('rate(hour)')).toThrow()
		expect(() => RateExpressionSchema.parse('rate(1)')).toThrow()
		expect(() => RateExpressionSchema.parse('0 hour')).toThrow()
		expect(() => RateExpressionSchema.parse('hour')).toThrow()
		expect(() => RateExpressionSchema.parse('1')).toThrow()
		expect(() => RateExpressionSchema.parse('')).toThrow()
	})

	it('cron expression', () => {
		expectTypeOf<z.input<typeof CronExpressionSchema>>().toEqualTypeOf<CronExpression>()
		expectTypeOf<z.output<typeof CronExpressionSchema>>().toEqualTypeOf<Schedule>()

		CronExpressionSchema.parse('cron(* * * * ? *)')
		CronExpressionSchema.parse('cron(5 * * * ? *)')
		CronExpressionSchema.parse('cron(5,10 * * * ? *)')

		expect(() => CronExpressionSchema.parse('')).toThrow()
		expect(() => CronExpressionSchema.parse('cron()')).toThrow()
		expect(() => CronExpressionSchema.parse('cron(* * * * *)')).toThrow()
		expect(() => CronExpressionSchema.parse('cron(f * * * * *)')).toThrow()
		expect(() => CronExpressionSchema.parse('cron(60 * * * * *)')).toThrow()
	})
})
