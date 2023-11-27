import { z } from 'zod'
import { definePlugin } from '../plugin.js'
import { FunctionSchema, toLambdaFunction } from './function.js'
import { Topic } from '../formation/resource/sns/topic.js'
import { SnsEventSource } from '../formation/resource/lambda/event-source/sns.js'
import { formatName, sub } from '../formation/util.js'
import { TypeGen, TypeObject } from '../util/type-gen.js'
import { EmailSchema, isEmail } from '../schema/email.js'
import { Subscription } from '../formation/resource/sns/subscription.js'
import { paramCase } from 'change-case'

export const TopicNameSchema = z
	.string()
	.min(3)
	.max(256)
	.regex(/^[a-z0-9\-]+$/i, 'Invalid topic name')
	.transform(value => paramCase(value))

const typeGenCode = `
import type { PublishOptions } from '@awsless/sns'
import type { Mock } from 'vitest'

type Publish<Name extends string> = {
	readonly name: Name
	(payload: unknown, options?: Omit<PublishOptions, 'topic' | 'payload'>): Promise<void>
}

type MockHandle = (payload: unknown) => void
type MockBuilder = (handle?: MockHandle) => void
`

export const topicPlugin = definePlugin({
	name: 'topic',
	schema: z.object({
		stacks: z
			.object({
				/** Define the events to publish too in your stack.
				 * @example
				 * {
				 *   topics: [ 'TOPIC_NAME' ]
				 * }
				 */
				topics: z
					.array(TopicNameSchema)
					.refine(topics => {
						return topics.length === new Set(topics).size
					}, 'Must be a list of unique topic names')
					.optional(),

				/** Define the events to subscribe too in your stack.
				 * @example
				 * {
				 *  subscribers: {
				 *     // Subscribe to a lambda function.
				 *     TOPIC_NAME: 'function.ts',
				 *
				 *     // Subscribe to an email address.
				 *     TOPIC_NAME: 'example@gmail.com',
				 *   }
				 * }
				 */
				subscribers: z.record(TopicNameSchema, z.union([EmailSchema, FunctionSchema])).optional(),
			})
			.array()
			.superRefine((stacks, ctx) => {
				const topics: string[] = []

				for (const stack of stacks) {
					topics.push(...(stack.topics || []))
				}

				for (const index in stacks) {
					const stack = stacks[index]
					for (const sub of Object.keys(stack.subscribers || {})) {
						if (!topics.includes(sub)) {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								message: `Topic subscription to "${sub}" is undefined`,
								path: [Number(index), 'subscribers'],
							})
						}
					}
				}
			}),
	}),
	onTypeGen({ config }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of config.stacks) {
			for (const topic of stack.topics || []) {
				const name = formatName(`${config.name}-${topic}`)

				mockResponses.addType(topic, 'Mock')
				resources.addType(topic, `Publish<'${name}'>`)
				mocks.addType(topic, `MockBuilder`)
			}
		}

		gen.addCode(typeGenCode)
		gen.addInterface('TopicResources', resources)
		gen.addInterface('TopicMock', mocks)
		gen.addInterface('TopicMockResponse', mockResponses)

		return gen.toString()
	},
	onApp({ config, bootstrap }) {
		for (const stack of config.stacks) {
			for (const id of stack.topics || []) {
				const topic = new Topic(id, {
					name: `${config.name}-${id}`,
				})

				bootstrap.add(topic)
				bootstrap.export(`topic-${id}-arn`, topic.arn)
			}
		}
	},
	onStack(ctx) {
		const { config, stack, stackConfig, bootstrap, bind } = ctx

		for (const id of stackConfig.topics || []) {
			bind(lambda => {
				lambda.addPermissions({
					actions: ['sns:Publish'],
					resources: [
						sub('arn:${AWS::Partition}:sns:${AWS::Region}:${AWS::AccountId}:${app}-${topic}', {
							app: config.name,
							topic: id,
						}),
					],
				})
			})
		}

		for (const [id, props] of Object.entries(stackConfig.subscribers || {})) {
			if (typeof props === 'string' && isEmail(props)) {
				// Check we need to subscribe to an email.
				const subscription = new Subscription(id, {
					topicArn: bootstrap.import(`topic-${id}-arn`),
					protocol: 'email',
					endpoint: props,
				})

				stack.add(subscription)
			} else {
				// Else it's a lambda...
				const lambda = toLambdaFunction(ctx as any, `topic-${id}`, props)
				const source = new SnsEventSource(id, lambda, {
					topicArn: bootstrap.import(`topic-${id}-arn`),
				})

				stack.add(lambda, source)
			}
		}
	},
})
