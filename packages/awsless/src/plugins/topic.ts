
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { FunctionSchema, toLambdaFunction } from './function.js';
import { Topic } from '../formation/resource/sns/topic.js';
import { SnsEventSource } from '../formation/resource/lambda/event-source/sns.js';
import { formatName, sub } from '../formation/util.js';
import { TypeGen } from '../util/type-gen.js';
// import { Topic } from 'aws-cdk-lib/aws-sns';
// import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
// import { Arn, ArnFormat } from 'aws-cdk-lib';
// import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const typeGenCode = `
import { PublishOptions } from '@awsless/sns'

type Publish<Name extends string> = {
	name: Name
	(payload: unknown, options?: Omit<PublishOptions, 'topic' | 'payload'>): Promise<void>
}`

export const topicPlugin = definePlugin({
	name: 'topic',
	schema: z.object({
		stacks: z.object({
			/** Define the events to publish too in your stack.
			 * @example
			 * {
			 *   topics: [ 'TOPIC_NAME' ]
			 * }
			 */
			topics: z.array(ResourceIdSchema).refine(topics => {
				return topics.length === new Set(topics).size
			}, 'Must be a list of unique topic names').optional(),

			/** Define the events to subscribe too in your stack.
			 * @example
			 * {
			 *   subscribers: {
			 *     TOPIC_NAME: 'function.ts'
			 *   }
			 * }
			 */
			subscribers: z.record(ResourceIdSchema, FunctionSchema).optional(),

		}).array().superRefine((stacks, ctx) => {

			const topics:string[] = []

			for(const stack of stacks) {
				topics.push(...(stack.topics || []))
			}

			for(const index in stacks) {
				const stack = stacks[index]
				for(const sub of Object.keys(stack.subscribers || {})) {
					if(!topics.includes(sub)) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Topic subscription to "${sub}" is undefined`,
							path: [ Number(index), 'subscribers' ],
						})
					}
				}
			}
		})
	}),
	onTypeGen({ config }) {
		const gen = new TypeGen('@awsless/awsless', 'TopicResources')
		gen.addCode(typeGenCode)

		for(const stack of config.stacks) {
			for(const topic of Object.keys(stack.topics || {})) {
				const name = formatName(`${config.name}-${topic}`)
				gen.addType(topic, `Publish<'${name}'>`)
			}
		}

		return gen.toString()
	},
	onApp({ config, bootstrap }) {
		for(const stack of config.stacks) {
			for(const id of stack.topics || []) {
				const topic = new Topic(id, {
					name: `${config.name}-${id}`
				})

				bootstrap.add(topic)
				bootstrap.export(`topic-${id}-arn`, topic.arn)
			}
		}
	},
	onStack(ctx) {
		const { config, stack, stackConfig, bootstrap, bind } = ctx

		for(const id of stackConfig.topics || []) {
			bind(lambda => {
				lambda.addPermissions({
					actions: [ 'sns:Publish' ],
					resources: [
						sub('arn:${AWS::Partition}:sns:${AWS::Region}:${AWS::AccountId}:${app}-${topic}', {
							app: config.name,
							topic: id,
						})
					],
				})
			})
		}

		for(const [ id, props ] of Object.entries(stackConfig.subscribers || {})) {
			const lambda = toLambdaFunction(ctx, `topic-${id}`, props)
			const source = new SnsEventSource(id, lambda, {
				topicArn: bootstrap.import(`topic-${id}-arn`)
			})

			stack.add(lambda, source)
		}
	},
})
