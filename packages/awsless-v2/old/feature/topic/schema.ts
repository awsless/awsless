import { paramCase } from 'change-case'
import { z } from 'zod'
import { EmailSchema } from '../../config/schema/email.js'
import { FunctionSchema } from '../function/schema.js'

export const TopicNameSchema = z
	.string()
	.min(3)
	.max(256)
	.regex(/^[a-z0-9\-]+$/i, 'Invalid topic name')
	.transform(value => paramCase(value))
	.describe('Define event topic name.')

export const TopicsSchema = z
	.array(TopicNameSchema)
	.refine(topics => {
		return topics.length === new Set(topics).size
	}, 'Must be a list of unique topic names')
	.optional()
	.describe('Define the event topics to publish too in your stack.')

export const SubscribersSchema = z
	.record(TopicNameSchema, z.union([EmailSchema, FunctionSchema]))
	.optional()
	.describe('Define the events to subscribe too in your stack.')

// export const TopicsSchema = z.object({
// 	stacks: z
// 		.object({
// 			/** Define the events to publish too in your stack.
// 			 * @example
// 			 * {
// 			 *   topics: [ 'TOPIC_NAME' ]
// 			 * }
// 			 */
// 			topics: z
// 				.array(TopicNameSchema)
// 				.refine(topics => {
// 					return topics.length === new Set(topics).size
// 				}, 'Must be a list of unique topic names')
// 				.optional()
// 				.describe('Define the event topics to publish too in your stack.'),

// 			/** Define the events to subscribe too in your stack.
// 			 * @example
// 			 * {
// 			 *  subscribers: {
// 			 *     // Subscribe to a lambda function.
// 			 *     TOPIC_NAME: 'function.ts',
// 			 *
// 			 *     // Subscribe to an email address.
// 			 *     TOPIC_NAME: 'example@gmail.com',
// 			 *   }
// 			 * }
// 			 */
// 			subscribers: z
// 				.record(TopicNameSchema, z.union([EmailSchema, FunctionSchema]))
// 				.optional()
// 				.describe('Define the events to subscribe too in your stack.'),
// 		})
// 		.array()
// 		.superRefine((stacks, ctx) => {
// 			const topics: string[] = []

// 			for (const stack of stacks) {
// 				topics.push(...(stack.topics || []))
// 			}

// 			for (const index in stacks) {
// 				const stack = stacks[index]
// 				for (const sub of Object.keys(stack.subscribers || {})) {
// 					if (!topics.includes(sub)) {
// 						ctx.addIssue({
// 							code: z.ZodIssueCode.custom,
// 							message: `Topic subscription to "${sub}" is undefined`,
// 							path: [Number(index), 'subscribers'],
// 						})
// 					}
// 				}
// 			}
// 		}),
// })
