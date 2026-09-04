import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { plainTestMockTypes, writeResourceTypes } from '../../type-gen/snippets.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'

const typeGenCode = `
import type { PublishOptions } from '@awsless/sns'
import type { GenericSchema, InferInput } from '@awsless/validate'
import type { Mock } from 'vitest'

type PublishTopicOptions = Omit<PublishOptions, 'topic' | 'payload'>

type TopicPublisher<Name extends string, S extends GenericSchema> = {
	(payload: InferInput<S>, options?: PublishTopicOptions): Promise<void>
	readonly name: Name
	readonly schema: S
}

type Publish<Name extends string> = {
	readonly name: Name

	// The payload schema lives with the topic: publishing only happens
	// through a defined topic, so every message is validated at the
	// source & the subscriber shares the exact same contract.
	readonly define: <S extends GenericSchema>(schema: S) => TopicPublisher<Name, S>
}

${plainTestMockTypes()}`

export const topicFeature = defineFeature({
	name: 'topic',
	async onDev(ctx) {
		if ((ctx.appConfig.topics ?? []).length === 0) {
			return
		}

		for (const id of ctx.appConfig.topics ?? []) {
			ctx.registerResource({
				kind: 'topic',
				id,
				detail: formatGlobalResourceName({
					appName: ctx.appConfig.name,
					resourceType: 'topic',
					resourceName: id,
				}),
			})
		}

		for (const stack of ctx.stackConfigs) {
			for (const id of Object.keys(stack.subscribers ?? {})) {
				ctx.registerResource({
					kind: 'subscriber',
					stack: stack.name,
					id,
					routeKey: formatRouteKey(stack.name, 'topic', id),
				})
			}
		}

		// The shared sns shim survives restarts, so long lived children
		// (like the vite dev server) keep a valid endpoint.
		await ctx.useSns()
	},
	async onTypeGen(ctx) {
		await writeResourceTypes(ctx, {
			kind: 'topic',
			interfaceName: 'TopicResources',
			code: typeGenCode,
			app(add) {
				for (const topic of ctx.appConfig.topics ?? []) {
					const name = formatGlobalResourceName({
						appName: ctx.appConfig.name,
						resourceType: 'topic',
						resourceName: topic,
					})

					add(topic, `Publish<'${name}'>`, `TestMockEntry`)
				}
			},
		})
	},
	onValidate(ctx) {
		const topics = ctx.appConfig.topics ?? []

		for (const stack of ctx.stackConfigs) {
			for (const topic of Object.keys(stack.subscribers ?? {})) {
				if (!topics.includes(topic)) {
					throw new FileError(stack.file, `Subscription to a non existent topic "${topic}"`)
				}
			}
		}
	},
	onApp(ctx) {
		for (const id of ctx.appConfig.topics ?? []) {
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
