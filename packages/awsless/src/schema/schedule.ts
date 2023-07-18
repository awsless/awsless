import { Schedule } from "aws-cdk-lib/aws-events"
import { Duration } from "./duration"
import { z } from "zod"

export type RateExpression = `rate(${ Duration })`
export type CronExpression = `cron(${string} ${string} ${string} ${string} ${string} ${string})`
export type ScheduleExpression = RateExpression | CronExpression

export const RateExpressionSchema = z.custom<RateExpression>((value) => {
	return z.string()
		.regex(/rate\([0-9]+ (seconds?|minutes?|hours?|days?)\)/, 'Invalid rate expression')
		.refine<RateExpression>((rate): rate is RateExpression => {
			const [ str ] = rate.substring(5).split(' ')
			const number = parseInt(str)
			return number > 0
		}, 'Rate duration must be greater then zero')
		.parse(value)
}).transform(Schedule.expression)

// TODO make a validation rule for cron expressions
export const CronExpressionSchema = z.custom<CronExpression>((value) => {
	return z.string()
	// .regex(/cron\(([0-9]+) \)/, 'Invalid Cron Expression')
	.refine<CronExpression>((cron): cron is CronExpression => !!cron)
	.parse(value)
}).transform((cron) => Schedule.expression(cron))

export const ScheduleExpressionSchema = z.union([ RateExpressionSchema, CronExpressionSchema ])

// Minutes

// 0-59

// , - * /

// Hours

// 0-23

// , - * /

// Day-of-month

// 1-31

// , - * ? / L W

// Month

// 1-12 or JAN-DEC

// , - * /

// Day-of-week

// 1-7 or SUN-SAT

// , - * ? L #

// Year

// 1970-2199

// , - * /
