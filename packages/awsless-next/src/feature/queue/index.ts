import { $, Group } from '@awsless/formation'
import { camelCase, constantCase } from 'change-case'
import deepmerge from 'deepmerge'
import { relative } from 'path'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { createLambdaFunction } from '../function/util.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { seconds, toSeconds } from '@awsless/duration'
import { toBytes } from '@awsless/size'

const typeGenCode = `
import { SendMessageOptions, SendMessageBatchOptions, BatchItem } from '@awsless/sqs'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any
type Payload<F extends Func> = Parameters<F>[0]['Records'][number]['body']

type Send<Name extends string, F extends Func> = {
	readonly name: Name
	batch(items:BatchItem<Payload<F>>[], options?:Omit<SendMessageBatchOptions, 'queue' | 'items'>): Promise<void>
	(payload: Payload<F>, options?: Omit<SendMessageOptions, 'queue' | 'payload'>): Promise<void>
}

type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => void
type MockBuilder<F extends Func> = (handle?: MockHandle<F>) => void
type MockObject<F extends Func> = Mock<Parameters<F>, ReturnType<F>>
`

export const queueFeature = defineFeature({
	name: 'queue',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const mock = new TypeObject(2)
			const mockResponse = new TypeObject(2)

			for (const [name, props] of Object.entries(stack.queues || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const queueName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'queue',
					resourceName: name,
				})

				if (typeof props === 'object' && 'file' in props.consumer.code) {
					const relFile = relative(directories.types, props.consumer.code.file)

					gen.addImport(varName, relFile)

					mock.addType(name, `MockBuilder<typeof ${varName}>`)
					resource.addType(name, `Send<'${queueName}', typeof ${varName}>`)
					mockResponse.addType(name, `MockObject<typeof ${varName}>`)
				} else {
					mock.addType(name, `MockBuilder<typeof ${varName}>`)
					resource.addType(name, `Send<'${queueName}', typeof ${varName}>`)
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
		for (const [id, local] of Object.entries(ctx.stackConfig.queues || {})) {
			const props = deepmerge(ctx.appConfig.defaults.queue, typeof local === 'object' ? local : {})

			const group = new Group(ctx.stack, 'queue', id)
			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'queue',
				resourceName: id,
			})

			// console.log(props)

			const onFailure = getGlobalOnFailure(ctx)

			const queue = new $.aws.sqs.Queue(group, 'queue', {
				name,
				delaySeconds: toSeconds(props.deliveryDelay),
				visibilityTimeoutSeconds: toSeconds(props.visibilityTimeout),
				receiveWaitTimeSeconds: toSeconds(props.receiveMessageWaitTime ?? seconds(0)),
				messageRetentionSeconds: toSeconds(props.retentionPeriod),
				maxMessageSize: toBytes(props.maxMessageSize),
				redrivePolicy: onFailure.pipe(arn =>
					JSON.stringify({
						deadLetterTargetArn: arn,
						maxReceiveCount: 100,
					})
				),
			})

			if (typeof local === 'object') {
				const lambdaConsumer = createLambdaFunction(group, ctx, `queue`, id, local.consumer)

				lambdaConsumer.setEnvironment('LOG_VIEWABLE_ERROR', '1')

				new $.aws.lambda.EventSourceMapping(
					group,
					'event',
					{
						functionName: lambdaConsumer.lambda.functionName,
						eventSourceArn: queue.arn,
						batchSize: props.batchSize,
						maximumBatchingWindowInSeconds: props.maxBatchingWindow && toSeconds(props.maxBatchingWindow),
						scalingConfig: {
							maximumConcurrency: props.maxConcurrency,
						},
					},
					{
						dependsOn: [lambdaConsumer.policy],
					}
				)

				lambdaConsumer.addPermission({
					actions: [
						//
						'sqs:ReceiveMessage',
						'sqs:DeleteMessage',
						'sqs:GetQueueAttributes',
					],
					resources: [queue.arn],
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
