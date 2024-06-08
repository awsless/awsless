import { aws, Node } from '@awsless/formation'
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

			for (const [name, fileOrProps] of Object.entries(stack.queues || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const queueName = formatLocalResourceName(ctx.appConfig.name, stack.name, 'queue', name)
				const file =
					typeof fileOrProps === 'string'
						? fileOrProps
						: typeof fileOrProps.consumer === 'string'
							? fileOrProps.consumer
							: fileOrProps.consumer.file
				const relFile = relative(directories.types, file)

				gen.addImport(varName, relFile)

				mock.addType(name, `MockBuilder<typeof ${varName}>`)
				resource.addType(name, `Send<'${queueName}', typeof ${varName}>`)
				mockResponse.addType(name, `MockObject<typeof ${varName}>`)
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
		// const { stack, config, stackConfig, bind } = ctx

		for (const [id, local] of Object.entries(ctx.stackConfig.queues || {})) {
			const props = deepmerge(ctx.appConfig.defaults.queue, local)

			const group = new Node(ctx.stack, 'queue', id)

			const queue = new aws.sqs.Queue(group, 'queue', {
				name: formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, 'queue', id),
				deadLetterArn: getGlobalOnFailure(ctx),
				...props,
			})

			const { lambda, policy } = createLambdaFunction(group, ctx, `queue`, id, props.consumer)

			lambda.addEnvironment('LOG_VIEWABLE_ERROR', '1')

			// const source = new SqsEventSource(id, lambda, {
			// 	queueArn: queue.arn,
			// 	batchSize: props.batchSize,
			// 	maxConcurrency: props.maxConcurrency,
			// 	maxBatchingWindow: props.maxBatchingWindow,
			// })

			new aws.lambda.EventSourceMapping(group, 'event', {
				functionArn: lambda.arn,
				sourceArn: queue.arn,
				batchSize: props.batchSize,
				maxBatchingWindow: props.maxBatchingWindow,
				maxConcurrency: props.maxConcurrency,
			}).dependsOn(policy)

			policy.addStatement({
				actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
				resources: [queue.arn],
			})

			ctx.addEnv(`QUEUE_${constantCase(ctx.stack.name)}_${constantCase(id)}_URL`, queue.url)

			// ctx.onFunction(lambda => {
			// 	lambda.addEnvironment(`QUEUE_${constantCase(ctx.stack.name)}_${constantCase(id)}_URL`, queue.url)
			// })

			ctx.onPolicy(policy => {
				policy.addStatement(queue.permissions)
			})
		}
	},
})
