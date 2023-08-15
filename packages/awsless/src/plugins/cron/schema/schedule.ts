import { DurationFormat } from '../../../schema/duration.js'
import { z } from "zod"
// @ts-ignore
import { awsCronExpressionValidator } from 'aws-cron-expression-validator'

export type RateExpression = `rate(${ DurationFormat })`
export type CronExpression = `cron(${string} ${string} ${string} ${string} ${string} ${string})`
export type ScheduleExpression = RateExpression | CronExpression

export const RateExpressionSchema = z.custom<RateExpression>((value) => {
	return z.string()
		.regex(/rate\([0-9]+ (seconds?|minutes?|hours?|days?)\)/)
		.refine<RateExpression>((rate): rate is RateExpression => {
			const [ str ] = rate.substring(5).split(' ')
			const number = parseInt(str)
			return number > 0
		})
		.safeParse(value).success
}, 'Invalid rate expression')

export const CronExpressionSchema = z.custom<CronExpression>((value) => {
	return z.string()
		.startsWith('cron(')
		.endsWith(')')
		.safeParse(value).success
}, 'Invalid cron expression').superRefine((value, ctx) => {
	const cron = value.substring(5, value.length - 1)

	try {
		awsCronExpressionValidator(cron)
	} catch(error) {
		if(error instanceof Error) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: error.message,
			})
		} else {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid cron expression',
			})
		}
	}
})

export const ScheduleExpressionSchema = RateExpressionSchema.or(CronExpressionSchema)
