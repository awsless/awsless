import { Schedule } from "aws-cdk-lib/aws-events"
import { Duration } from "../../../schema/duration"
import cron from 'cron-validate'
import { z } from "zod"

export type RateExpression = `rate(${ Duration })`
export type CronExpression = `cron(${string} ${string} ${string} ${string} ${string} ${string})`
export type ScheduleExpression = RateExpression | CronExpression

export const RateExpressionSchema = z.custom<RateExpression>((value) => {
	return z.string()
		// .startsWith('rate(')
		// .endsWith(')')
		.regex(/rate\([0-9]+ (seconds?|minutes?|hours?|days?)\)/)
		.refine<RateExpression>((rate): rate is RateExpression => {
			const [ str ] = rate.substring(5).split(' ')
			const number = parseInt(str)
			return number > 0
		})
		.safeParse(value)
}, 'Invalid rate expression').transform(Schedule.expression)

// TODO make a validation rule for cron expressions
export const CronExpressionSchema = z.custom<CronExpression>((value) => {
	return z.string()
		.startsWith('cron(')
		.endsWith(')')
		.refine(value => {
			return cron(value.substring(5, -1), {
				preset: 'aws-cloud-watch',
			}).isValid
		})
		.safeParse(value)
}, 'Invalid cron expression').transform((value) => Schedule.expression(value))

export const ScheduleExpressionSchema = RateExpressionSchema.or(CronExpressionSchema)
