import { z } from 'zod'
import { DurationSchema } from '../../config/schema/duration.js'
import { EmailSchema } from '../../config/schema/email.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { BundledFunctionSchema } from '../function/schema.js'

const ops = {
	'>': 'GreaterThanThreshold',
	'>=': 'GreaterThanOrEqualToThreshold',
	'<': 'LessThanThreshold',
	'<=': 'LessThanOrEqualToThreshold',
}

const stats = {
	count: 'SampleCount',
	avg: 'Average',
	sum: 'Sum',
	min: 'Minimum',
	max: 'Maximum',
}

const WhereSchema = z
	.union([
		z
			.string()
			.regex(/(count|avg|sum|min|max) (>|>=|<|<=) (\d)/, 'Invalid where query')
			.transform(where => {
				const [stat, op, value] = where.split(' ') as [keyof typeof stats, keyof typeof ops, string]
				return { stat, op, value: parseFloat(value) }
			}),
		z.object({
			stat: z.enum(['count', 'avg', 'sum', 'min', 'max']),
			op: z.enum(['>', '>=', '<', '<=']),
			value: z.number(),
		}),
	])
	.transform(where => {
		return {
			stat: stats[where.stat],
			op: ops[where.op],
			value: where.value,
		}
	})

const AlarmSchema = z.object({
	description: z.string().optional(),
	where: WhereSchema,
	period: DurationSchema,
	minDataPoints: z.number().int().default(1),
	trigger: z.union([EmailSchema.transform(v => [v]), EmailSchema.array(), BundledFunctionSchema]),
})

export const MetricsSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			type: z.enum(['number', 'size', 'duration']),
			alarms: AlarmSchema.array().optional(),
		})
	)
	.optional()
	.describe('Define the metrics in your stack.')
