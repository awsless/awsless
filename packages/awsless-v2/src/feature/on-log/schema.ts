import { z } from 'zod'
import { FunctionSchema } from '../function/schema.js'

export type OnLogFilter = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

const FilterSchema = z
	.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
	.array()
	.describe('The log level that will gets delivered to the consumer.')

export const OnLogDefaultSchema = z
	.union([
		FunctionSchema.transform(consumer => ({
			consumer,
			filter: ['error', 'fatal'] as OnLogFilter[],
		})),
		z.object({
			consumer: FunctionSchema,
			filter: FilterSchema,
		}),
	])
	.optional()
	.describe('Define a subscription on all Lambda functions logs.')
