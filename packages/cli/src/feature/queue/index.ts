import { relative } from 'path'
import { minutes, seconds, toSeconds } from '@awsless/duration'
import { toBytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { camelCase, constantCase } from 'change-case'
import deepmerge from 'deepmerge'
import { defineFeature } from '../../feature.js'
import { funcType, testMockTypes, writeResourceTypes } from '../../type-gen/snippets.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'

const typeGenCode = `
import {
	SendMessageOptions,
	SendMessageBatchOptions,
	BatchItem,
} from '@awsless/sqs'
import type { Mock } from 'vitest'

${funcType}
type Payload<F extends Func> = Parameters<F>[0]['Records'][number]['body']

type Required<T> = T & { groupId: string; deduplicationId: string }

type Send<Name extends string, F extends Func> = {
	readonly name: Name
	batch(items: Required<BatchItem<Payload<F>>>[], options?: Omit<SendMessageBatchOptions, 'queue' | 'items'>): Promise<void>
	(payload: Payload<F>, options: Required<Omit<SendMessageOptions, 'queue' | 'payload'>>): Promise<void>
}

${testMockTypes()}`

export const queueFeature = defineFeature({
	name: 'queue',
	async onDev(ctx) {
		const queues = ctx.stackConfigs.flatMap(stack => {
			return Object.keys(stack.queues ?? {}).map(id => ({ stackName: stack.name, id }))
		})

		if (queues.length === 0) {
			return
		}

		// The shared sqs shim survives restarts, so long lived children
		// (like the vite dev server) keep a valid endpoint.
		const { port, queues: registry } = await ctx.useSqs()

		const named = queues.map(({ stackName, id }) => {
			const name = `${formatLocalResourceName({
				appName: ctx.appConfig.name,
				stackName,
				resourceType: 'queue',
				resourceName: id,
			})}.fifo`

			registry.set(name, formatRouteKey(stackName, 'queue', id))

			return { stackName, id, name }
		})

		for (const { stackName, id, name } of named) {
			ctx.addEnv(
				`QUEUE_${constantCase(stackName)}_${constantCase(id)}_URL`,
				`http://127.0.0.1:${port}/000000000000/${name}`
			)

			ctx.registerResource({
				kind: 'queue',
				stack: stackName,
				id,
				routeKey: formatRouteKey(stackName, 'queue', id),
				detail: name,
			})
		}
	},
	async onTypeGen(ctx) {
		await writeResourceTypes(ctx, {
			kind: 'queue',
			interfaceName: 'QueueResources',
			code: typeGenCode,
			stacks(stack, add, types) {
				for (const [name, props] of Object.entries(stack.queues || {})) {
					const varName = camelCase(`${stack.name}-${name}`)
					const queueName = `${formatLocalResourceName({
						appName: ctx.appConfig.name,
						stackName: stack.name,
						resourceType: 'queue',
						resourceName: name,
					})}.fifo`

					if (props.consumer) {
						types.addImport(varName, relative(directories.types, props.consumer.code.file))
						add(name, `Send<'${queueName}', typeof ${varName}>`, `TestMockEntry<typeof ${varName}>`)
					} else {
						add(name, `Send<'${queueName}', Func>`, `TestMockEntry<Func>`)
					}
				}
			},
		})
	},
	onStack(ctx) {
		const bundleTimeout = toSeconds(ctx.appConfig.function.timeout)

		for (const [id, local] of Object.entries(ctx.stackConfig.queues || {})) {
			const props = deepmerge(ctx.appConfig.queue, local)

			const group = new Group(ctx.stack, 'queue', id)
			const baseName = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'queue',
				resourceName: id,
			})

			const queue = new aws.sqs.Queue(
				group,
				'queue',
				{
					name: `${baseName}.fifo`,
					visibilityTimeoutSeconds: bundleTimeout + toSeconds(minutes(1)),
					receiveWaitTimeSeconds: toSeconds(props.receiveMessageWaitTime ?? seconds(0)),
					messageRetentionSeconds: toSeconds(props.retentionPeriod),
					maxMessageSize: toBytes(props.maxMessageSize),
					fifoQueue: true,
					deduplicationScope: 'messageGroup',
					fifoThroughputLimit: 'perMessageGroupId',
				},
				{
					import: ctx.import
						? `https://sqs.${ctx.appConfig.region}.amazonaws.com/${ctx.accountId}/${baseName}.fifo`
						: undefined,
				}
			)

			if (local.consumer) {
				// The bundle routes the queue event to the right consumer based on the event source arn.
				const bundle = registerBundleFunction(ctx, formatRouteKey(ctx.stack.name, 'queue', id), local.consumer)

				new aws.lambda.EventSourceMapping(
					group,
					'event',
					{
						functionName: bundle.alias.arn,
						eventSourceArn: queue.arn,
						batchSize: props.batchSize,
					},
					{
						dependsOn: [bundle.policy],
					}
				)
			}

			ctx.addEnv(`QUEUE_${constantCase(ctx.stack.name)}_${constantCase(id)}_URL`, queue.url)

			ctx.addPermission({
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
