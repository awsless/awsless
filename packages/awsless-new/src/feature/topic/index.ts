import { Node, aws } from '@awsless/formation'
import { isEmail } from '../../config/schema/email.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { createLambdaFunction } from '../function/util.js'

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

export const topicFeature = defineFeature({
	name: 'topic',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			for (const topic of stack.topics || []) {
				const name = formatGlobalResourceName(ctx.appConfig.name, 'topic', topic)

				mockResponses.addType(topic, 'Mock')
				resources.addType(topic, `Publish<'${name}'>`)
				mocks.addType(topic, `MockBuilder`)
			}
		}

		gen.addCode(typeGenCode)
		gen.addInterface('TopicResources', resources)
		gen.addInterface('TopicMock', mocks)
		gen.addInterface('TopicMockResponse', mockResponses)

		await ctx.write('topic.d.ts', gen, true)
	},
	onApp(ctx) {
		for (const stack of ctx.stackConfigs) {
			for (const id of stack.topics ?? []) {
				const group = new Node('topic', id)
				ctx.base.add(group)

				const topic = new aws.sns.Topic('topic', {
					name: formatGlobalResourceName(ctx.appConfig.name, 'topic', id),
				})

				group.add(topic)

				ctx.base.export(`topic-${id}-arn`, topic.arn)
			}
		}
	},
	onStack(ctx) {
		for (const id of ctx.stackConfig.topics ?? []) {
			ctx.onFunction(({ policy }) => {
				policy.addStatement({
					actions: ['sns:Publish'],
					resources: [ctx.app.import('base', `topic-${id}-arn`)],
				})
			})
		}

		for (const [id, props] of Object.entries(ctx.stackConfig.subscribers ?? {})) {
			const group = new Node('topic', id)
			ctx.stack.add(group)

			const topicArn = ctx.app.import<aws.ARN>('base', `topic-${id}-arn`)

			if (typeof props === 'string' && isEmail(props)) {
				// Check we need to subscribe to an email.
				const subscription = new aws.sns.Subscription(id, {
					topicArn,
					protocol: 'email',
					endpoint: props,
				})

				group.add(subscription)
			} else if (typeof props === 'object') {
				// Else it's a lambda...
				const { lambda } = createLambdaFunction(group, ctx, `topic`, id, props)

				const topic = new aws.sns.Subscription(id, {
					topicArn,
					protocol: 'lambda',
					endpoint: lambda.arn,
				})

				const permission = new aws.lambda.Permission(id, {
					action: 'lambda:InvokeFunction',
					principal: 'sns.amazonaws.com',
					functionArn: lambda.arn,
					sourceArn: topicArn,
				})

				group.add(topic, permission)
			}
		}
	},
})
