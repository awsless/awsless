import { aws, Node } from '@awsless/formation'
import { isEmail } from '../../config/schema/email.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { createAsyncLambdaFunction } from '../function/util.js'
import { FileError } from '../../error.js'

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
				const name = formatGlobalResourceName({
					appName: ctx.appConfig.name,
					resourceType: 'topic',
					resourceName: topic,
				})

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
	onValidate(ctx) {
		const unique: string[] = []

		for (const stack of ctx.stackConfigs) {
			for (const topic of stack.topics ?? []) {
				if (unique.includes(topic)) {
					throw new FileError(stack.file, `Duplicate topic "${topic}"`)
				} else {
					unique.push(topic)
				}
			}
		}

		for (const stack of ctx.stackConfigs) {
			for (const topic of Object.keys(stack.subscribers ?? {})) {
				if (!unique.includes(topic)) {
					throw new FileError(stack.file, `Subscription to a undefined topic "${topic}"`)
				}
			}
		}
	},
	onApp(ctx) {
		for (const stack of ctx.stackConfigs) {
			for (const id of stack.topics ?? []) {
				const group = new Node(ctx.base, 'topic', id)
				const name = formatGlobalResourceName({
					appName: ctx.appConfig.name,
					resourceType: 'topic',
					resourceName: id,
				})

				const topic = new aws.sns.Topic(group, 'topic', {
					name,
				})

				ctx.shared.set(`topic-${id}-arn`, topic.arn)
			}
		}

		ctx.onAppPolicy(policy => {
			// Give access to all app functions
			policy.addStatement({
				actions: ['sns:Publish'],
				resources: [
					`arn:aws:sns:${ctx.appConfig.region}:${ctx.accountId}:${formatGlobalResourceName({
						appName: ctx.app.name,
						resourceType: 'topic',
						resourceName: '*',
					})}`,
				],
			})
		})
	},
	onStack(ctx) {
		for (const id of ctx.stackConfig.topics ?? []) {
			ctx.onStackPolicy(policy => {
				policy.addStatement({
					actions: ['sns:Publish'],
					resources: [ctx.shared.get<aws.ARN>(`topic-${id}-arn`)],
				})
			})
		}

		for (const [id, props] of Object.entries(ctx.stackConfig.subscribers ?? {})) {
			const group = new Node(ctx.stack, 'topic', id)

			const topicArn = ctx.shared.get<aws.ARN>(`topic-${id}-arn`)

			if (typeof props === 'string' && isEmail(props)) {
				// Check we need to subscribe to an email.
				new aws.sns.Subscription(group, id, {
					topicArn,
					protocol: 'email',
					endpoint: props,
				})
			} else if (typeof props === 'object') {
				// Else it's a lambda...
				const { lambda } = createAsyncLambdaFunction(group, ctx, `topic`, id, props)

				new aws.sns.Subscription(group, id, {
					topicArn,
					protocol: 'lambda',
					endpoint: lambda.arn,
				})

				new aws.lambda.Permission(group, id, {
					action: 'lambda:InvokeFunction',
					principal: 'sns.amazonaws.com',
					functionArn: lambda.arn,
					sourceArn: topicArn,
				})
			}
		}
	},
})
