import { definePlugin } from '../../plugin.js'
import { toLambdaFunction } from '../function/index.js'
import { Queue } from '../../formation/resource/sqs/queue.js'
import { SqsEventSource } from '../../formation/resource/lambda/event-source/sqs.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { formatName } from '../../formation/util.js'
import { camelCase, constantCase } from 'change-case'
import { directories } from '../../util/path.js'
import { relative } from 'path'

const typeGenCode = `
import { SendMessageOptions, SendMessageBatchOptions, BatchItem } from '@awsless/sqs'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any
type Payload<F extends Func> = Parameters<F>[0]['Records'][number]['body']

type Send<Name extends string, F extends Func> = {
	readonly name: Name
	readonly batch(items:BatchItem<Payload<F>>[], options?:Omit<SendMessageBatchOptions, 'queue' | 'items'>): Promise<void>
	(payload: Payload<F>, options?: Omit<SendMessageOptions, 'queue' | 'payload'>): Promise<void>
}

type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => void
type MockBuilder<F extends Func> = (handle?: MockHandle<F>) => void
type MockObject<F extends Func> = Mock<Parameters<F>, ReturnType<F>>
`

export const queuePlugin = definePlugin({
	name: 'queue',
	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of config.stacks) {
			const resource = new TypeObject(2)
			const mock = new TypeObject(2)
			const mockResponse = new TypeObject(2)

			for (const [name, fileOrProps] of Object.entries(stack.queues || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const queueName = formatName(`${config.app.name}-${stack.name}-${name}`)
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

		await write('queue.d.ts', gen, true)
	},
	onStack(ctx) {
		const { stack, config, stackConfig, bind } = ctx

		for (const [id, functionOrProps] of Object.entries(stackConfig.queues || {})) {
			const props =
				typeof functionOrProps === 'string'
					? { ...config.app.defaults.queue, consumer: functionOrProps }
					: { ...config.app.defaults.queue, ...functionOrProps }

			const queue = new Queue(id, {
				name: `${config.app.name}-${stack.name}-${id}`,
				deadLetterArn: getGlobalOnFailure(ctx),
				...props,
			})

			const lambda = toLambdaFunction(ctx as any, `queue-${id}`, props.consumer)
			const source = new SqsEventSource(id, lambda, {
				queueArn: queue.arn,
				batchSize: props.batchSize,
				maxConcurrency: props.maxConcurrency,
				maxBatchingWindow: props.maxBatchingWindow,
			})

			stack.add(queue, lambda, source)

			bind(lambda => {
				lambda.addPermissions(queue.permissions)
				lambda.addEnvironment(`QUEUE_${constantCase(stack.name)}_${constantCase(id)}_URL`, queue.url)
			})
		}
	},
})
