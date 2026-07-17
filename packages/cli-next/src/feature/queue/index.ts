import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { camelCase, constantCase } from 'change-case'
import deepmerge from 'deepmerge'
import { relative } from 'path'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'
import { minutes, seconds, toSeconds } from '@awsless/duration'
import { toBytes } from '@awsless/size'

const typeGenCode = `
import {
	SendMessageOptions,
	SendMessageBatchOptions,
	BatchItem,
} from '@awsless/sqs'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any
type Payload<F extends Func> = Parameters<F>[0]['Records'][number]['body']

type Required<T> = T & { groupId: string; deduplicationId: string }

type Send<Name extends string, F extends Func> = {
	readonly name: Name
	batch(items: Required<BatchItem<Payload<F>>>[], options?: Omit<SendMessageBatchOptions, 'queue' | 'items'>): Promise<void>
	(payload: Payload<F>, options: Required<Omit<SendMessageOptions, 'queue' | 'payload'>>): Promise<void>
}

type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => void
type MockBuilder<F extends Func> = (handle?: MockHandle<F>) => void
type MockObject<F extends Func> = Mock<Parameters<F>, ReturnType<F>>
`

export const queueFeature = defineFeature({
	name: 'queue',
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const mock = new TypeObject(2)
			const mockResponse = new TypeObject(2)

			for (const [name, props] of Object.entries(stack.queues || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const queueName = `${formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'queue',
					resourceName: name,
				})}.fifo`

				if (typeof props === 'object' && props.consumer) {
					const relFile = relative(directories.types, props.consumer.code.file)

					gen.addImport(varName, relFile)

					mock.addType(name, `MockBuilder<typeof ${varName}>`)
					resource.addType(name, `Send<'${queueName}', typeof ${varName}>`)
					mockResponse.addType(name, `MockObject<typeof ${varName}>`)
				} else {
					resource.addType(name, `Send<'${queueName}', Func>`)
					mock.addType(name, `MockBuilder<Func>`)
					mockResponse.addType(name, `MockObject<Func>`)
				}
			}

			mocks.addType(stack.name, mock)
			resources.addType(stack.name, resource)
			mockResponses.addType(stack.name, mockResponse)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('QueueResources', resources)
		gen.addInterface('QueueMock', mocks)
		gen.addInterface('QueueMockResponse', mockResponses)

		await ctx.write('queue.d.ts', gen, true)
	},
	onStack(ctx) {
		const bundleTimeout = toSeconds(ctx.appConfig.defaults.function.timeout)

		for (const [id, local] of Object.entries(ctx.stackConfig.queues || {})) {
			const props = deepmerge(ctx.appConfig.defaults.queue, typeof local === 'object' ? local : {})

			const group = new Group(ctx.stack, 'queue', id)
			const baseName = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'queue',
				resourceName: id,
			})

			const queue = new aws.sqs.Queue(group, 'queue', {
				name: `${baseName}.fifo`,
				visibilityTimeoutSeconds: bundleTimeout + toSeconds(minutes(1)),
				receiveWaitTimeSeconds: toSeconds(props.receiveMessageWaitTime ?? seconds(0)),
				messageRetentionSeconds: toSeconds(props.retentionPeriod),
				maxMessageSize: toBytes(props.maxMessageSize),
				fifoQueue: true,
				deduplicationScope: 'messageGroup',
				fifoThroughputLimit: 'perMessageGroupId',
			})

			if (local.consumer) {
				const consumer = local.consumer

				// The bundle routes the queue event to the right consumer based on the event source arn.
				const bundle = registerBundleFunction(ctx, formatRouteKey(ctx.stack.name, 'queue', id), consumer)

				new aws.lambda.EventSourceMapping(group, 'event', {
					functionName: bundle.alias.arn,
					eventSourceArn: queue.arn,
					batchSize: props.batchSize,
				}, {
					dependsOn: [bundle.policy],
				})
			}

			ctx.addEnv(`QUEUE_${constantCase(ctx.stack.name)}_${constantCase(id)}_URL`, queue.url)

			ctx.addStackPermission({
				actions: [
					'sqs:SendMessage',
					'sqs:ReceiveMessage',
					'sqs:DeleteMessage',
					'sqs:ChangeMessageVisibility',
					'sqs:GetQueueUrl',
					'sqs:GetQueueAttributes',
				],
				resources: [queue.arn],
			})
		}
	},
})
