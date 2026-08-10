import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'
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
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const topic of ctx.appConfig.defaults.topics ?? []) {
			const name = formatGlobalResourceName({
				appName: ctx.appConfig.name,
				resourceType: 'topic',
				resourceName: topic,
			})

			mockResponses.addType(topic, 'Mock')
			resources.addType(topic, `Publish<'${name}'>`)
			mocks.addType(topic, `MockBuilder`)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('TopicResources', resources)
		gen.addInterface('TopicMock', mocks)
		gen.addInterface('TopicMockResponse', mockResponses)

		await ctx.write('topic.d.ts', gen, true)
	},
	onValidate(ctx) {
		const topics = ctx.appConfig.defaults.topics ?? []

		for (const stack of ctx.stackConfigs) {
			for (const topic of Object.keys(stack.subscribers ?? {})) {
				if (!topics.includes(topic)) {
					throw new FileError(stack.file, `Subscription to a non existent topic "${topic}"`)
				}
			}
		}
	},
	onApp(ctx) {
		for (const id of ctx.appConfig.defaults.topics ?? []) {
			const group = new Group(ctx.base, 'topic', id)
			const name = formatGlobalResourceName({
				appName: ctx.appConfig.name,
				resourceType: 'topic',
				resourceName: id,
			})

			const topic = new aws.sns.Topic(
				group,
				'topic',
				{
					name,
				},
				{
					import: ctx.import ? `arn:aws:sns:${ctx.appConfig.region}:${ctx.accountId}:${name}` : undefined,
				}
			)

			// All subscribers share the bundle as their endpoint, so we subscribe the bundle once per topic.
			const subscribed = ctx.stackConfigs.some(stack => stack.subscribers?.[id])

			if (subscribed) {
				const bundle = ctx.shared.get('bundle', 'main')

				// Accepted staging window: a NEW subscription on an already
				// active topic delivers to the old live bundle until promote,
				// which retries those events as unknown routes.
				new aws.sns.TopicSubscription(group, 'subscription', {
					topicArn: topic.arn,
					protocol: 'lambda',
					endpoint: bundle.alias.arn,
				})

				new aws.lambda.Permission(group, 'permission', {
					action: 'lambda:InvokeFunction',
					principal: 'sns.amazonaws.com',
					functionName: bundle.lambda.functionName,
					qualifier: bundle.alias.name,
					sourceArn: topic.arn,
				})
			}
		}

		ctx.addPermission({
			actions: ['sns:Publish'],
			resources: [
				`arn:aws:sns:${ctx.appConfig.region}:${ctx.accountId}:${formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'topic',
					resourceName: '*',
				})}`,
			],
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.subscribers ?? {})) {
			registerBundleFunction(ctx, formatRouteKey(ctx.stack.name, 'topic', id), props.consumer)
		}
	},
})
