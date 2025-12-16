import { definePlugin } from '../../feature.js'
import { toLambdaFunction } from '../function/index.js'
import { Topic } from '../../formation/resource/sns/topic.js'
import { SnsEventSource } from '../../formation/resource/lambda/event-source/sns.js'
import { formatName, sub } from '../../formation/util.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { isEmail } from '../../config/schema/email.js'
import { Subscription } from '../../formation/resource/sns/subscription.js'

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
	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of config.stacks) {
			for (const topic of stack.topics || []) {
				const name = formatName(`${config.app.name}-${topic}`)

				mockResponses.addType(topic, 'Mock')
				resources.addType(topic, `Publish<'${name}'>`)
				mocks.addType(topic, `MockBuilder`)
			}
		}

		gen.addCode(typeGenCode)
		gen.addInterface('TopicResources', resources)
		gen.addInterface('TopicMock', mocks)
		gen.addInterface('TopicMockResponse', mockResponses)

		await write('topic.d.ts', gen, true)
	},
	onApp({ config, bootstrap }) {
		for (const stack of config.stacks) {
			for (const id of stack.topics || []) {
				const topic = new Topic(id, {
					name: `${config.app.name}-${id}`,
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
							app: config.app.name,
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
				const lambda = toLambdaFunction(ctx, `topic-${id}`, props)
				const source = new SnsEventSource(id, lambda, {
					topicArn: bootstrap.import(`topic-${id}-arn`),
				})

				stack.add(lambda, source)
			}
		}
	},
})
