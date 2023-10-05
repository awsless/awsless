import { DurationFormat } from '../../../schema/duration.js'
import { z } from "zod"
// @ts-ignore
import { awsCronExpressionValidator } from 'aws-cron-expression-validator'
// import { debug } from '../../../cli/logger.js'

export type RateExpression = DurationFormat
export type CronExpression = `${string} ${string} ${string} ${string} ${string} ${string}`
export type ScheduleExpression = RateExpression | CronExpression

export const RateExpressionSchema = z.custom<RateExpression>((value) => {
	return z.string()
		.regex(/^[0-9]+ (seconds?|minutes?|hours?|days?)$/)
		.refine<RateExpression>((rate): rate is RateExpression => {
			const [ str ] = rate.split(' ')
			const number = parseInt(str)
			return number > 0
		})
		.safeParse(value).success
}, { message: 'Invalid rate expression' }).transform((rate) => {
	const [ str ] = rate.split(' ')
	const number = parseInt(str)
	const more = rate.endsWith('s')

	if(more && number === 1) {
		return `rate(${rate.substring(0, rate.length - 1)})`
	}

	return `rate(${rate})`
})

// export const RateExpressionSchema = DurationSchema.transform((value) => {
// 	return `rate(${value.toSeconds()} seconds)`
// })

export const CronExpressionSchema = z.custom<CronExpression>((value) => {
	return z.string()
		.safeParse(value).success
}, { message: 'Invalid cron expression' }).superRefine((value, ctx) => {
	try {
		awsCronExpressionValidator(value)
	} catch(error) {
		if(error instanceof Error) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Invalid cron expression: ${ error.message }`,
			})
		} else {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid cron expression',
			})
		}
	}
}).transform((value) => {
	return `cron(${value.trim()})`
})

// export const ScheduleExpressionSchema = z.union([ RateExpressionSchema, CronExpressionSchema ])

export const ScheduleExpressionSchema = RateExpressionSchema.or(CronExpressionSchema)
