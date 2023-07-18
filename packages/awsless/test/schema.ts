import { z } from "zod";
import { Duration, DurationSchema } from "../src/schema/duration"
import { Duration as CDKDuration } from 'aws-cdk-lib/core'
import { CronExpression, CronExpressionSchema, RateExpression, RateExpressionSchema } from "../src/schema/schedule";
import { Schedule } from "aws-cdk-lib/aws-events";
import { AppSchema } from "../src/schema/app";

describe('schema', () => {
	it('duration', () => {
		expectTypeOf<z.input<typeof DurationSchema>>().toEqualTypeOf<Duration>()
		expectTypeOf<z.output<typeof DurationSchema>>().toEqualTypeOf<CDKDuration>()
		DurationSchema.parse('1 minute')
		DurationSchema.parse('99 minutes')
		DurationSchema.parse('1 hour')
		expect(() => DurationSchema.parse('hour')).toThrow()
		expect(() => DurationSchema.parse('1')).toThrow()
		// expect(() => DurationSchema.parse('0 hour')).toThrow()
	})

	it('rate expression', () => {
		expectTypeOf<z.input<typeof RateExpressionSchema>>().toEqualTypeOf<RateExpression>()
		expectTypeOf<z.output<typeof RateExpressionSchema>>().toEqualTypeOf<Schedule>()
		RateExpressionSchema.parse('rate(1 minute)')
		RateExpressionSchema.parse('rate(99 minutes)')
		RateExpressionSchema.parse('rate(1 hour)')

		expect(() => RateExpressionSchema.parse('hour')).toThrow()
		expect(() => RateExpressionSchema.parse('1')).toThrow()
		expect(() => RateExpressionSchema.parse('0 hour')).toThrow()
	})

	it('cron expression', () => {
		expectTypeOf<z.input<typeof CronExpressionSchema>>().toEqualTypeOf<CronExpression>()
		expectTypeOf<z.output<typeof CronExpressionSchema>>().toEqualTypeOf<Schedule>()
		const value = CronExpressionSchema.parse('cron(* * * * * *)')
		console.log(value);
	})

	it('test', () => {
		const schema = z.object({
			defaults: z.object({
				function: z.object({
					value: z.string().default('HELLO')
				}).default({}),
			}).default({}),
			stacks: z.object({
				other: z.string().optional(),
			}).array()
		})

		const value = AppSchema.and(schema).parse({
			name: 'app',
			region: 'us-east-1',
			profile: 'lol',
			stacks: [{}],
		})

		console.log(value);

	})
})
