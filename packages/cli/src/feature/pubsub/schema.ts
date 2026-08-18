import { days } from '@awsless/duration'
import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { BundledFunctionSchema } from '../function/schema.js'
import { LogSchema } from '../instance/schema.js'
import { RouteSchema } from '../router/schema.js'

export const PubSubDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			auth: BundledFunctionSchema.describe(
				'The authorizer that validates the client auth token and returns the allowed topics.'
			),
			router: ResourceIdSchema.describe('The router id to route pubsub traffic through.'),
			path: RouteSchema.default('/ws').describe('The base path on the router that exposes the pubsub endpoint.'),
			log: LogSchema.prefault(true).transform(log => ({
				retention: log.retention ?? days(7),
			})),
		})
	)
	.optional()
	.describe('Define the pubsub API for your app. Backed by a websocket server on AWS Fargate.')

export const PubSubSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			connected: BundledFunctionSchema.optional().describe('Subscribe to the event when a client connects.'),
			disconnected: BundledFunctionSchema.optional().describe('Subscribe to the event when a client disconnects.'),
			subscribed: BundledFunctionSchema.optional().describe(
				'Subscribe to the event when a client subscribes to topics.'
			),
			unsubscribed: BundledFunctionSchema.optional().describe(
				'Subscribe to the event when a client unsubscribes from topics.'
			),
		})
	)
	.optional()
	.describe('Define the pubsub event listeners in your stack.')

export type PubSubDefaultProps = NonNullable<z.output<typeof PubSubDefaultSchema>>[string]
export type PubSubEventType = 'connected' | 'disconnected' | 'subscribed' | 'unsubscribed'

export const pubsubEventTypes = ['connected', 'disconnected', 'subscribed', 'unsubscribed'] as const
