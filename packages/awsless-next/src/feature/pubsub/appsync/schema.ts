import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

const DomainSchema = ResourceIdSchema.describe('The domain id to link your Pubsub API with.')

export const PubSubDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			auth: FunctionSchema.describe('The authentication function for the pubsub API.'),
			domain: DomainSchema.optional(),
			subDomain: z.string().optional(),

			namespaces: z
				.array(z.string())
				.optional()
				.describe('The namespaces for the PubSub API. If not set, a single "default" namespace is created.'),

			logLevel: z
				.enum(['none', 'info', 'error', 'debug', 'all'])
				.optional()
				.describe('The logging level for AppSync API. When set, logging is enabled.'),
		})
	)
	.optional()
	.describe('Define the pubsub API configuration in your stack.')

export const PubSubSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			channels: z.array(z.string()).describe('The event channels this subscriber listens to.'),

			filter: z
				.object({
					eventType: z.string().optional().describe('Filter events by event type.'),
					// Add more filter options as needed
					// userId: z.string().optional(),
					// custom: z.record(z.string(), z.any()).optional(),
				})
				.optional()
				.describe('Event filtering options.'),

			consumer: FunctionSchema.describe('The consuming lambda function properties.'),

			batchSize: z
				.number()
				.int()
				.min(1)
				.max(100)
				.default(1)
				.describe('Number of events to batch before invoking the consumer function.'),

			retryPolicy: z
				.object({
					maxRetries: z.number().int().min(0).max(3).default(2).describe('Maximum number of retry attempts.'),
				})
				.optional()
				.describe('Retry policy for failed event processing.'),
		})
	)
	.optional()
	.describe('Define the pubsub event subscribers in your stack.')
