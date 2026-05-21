import { days, seconds, toSeconds } from '@awsless/duration'
import { kibibytes, toBytes } from '@awsless/size'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name'
import { createFargateTask } from './util'

const typeGenCode = `
import { SendMessageOptions } from '@awsless/sqs'
import type { Mock } from 'vitest'

type Send<Name extends string> = {
	readonly name: Name
	(payload: unknown, options?: Omit<SendMessageOptions, 'queue' | 'payload' | 'groupId' | 'deduplicationId'>): Promise<void>
}

type MockHandle = (payload: unknown) => void
type MockBuilder = (handle?: MockHandle) => void
type MockObject = Mock<[unknown], unknown>
`

export const instanceFeature = defineFeature({
	name: 'instance',
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const mock = new TypeObject(2)
			const mockResponse = new TypeObject(2)

			for (const name of Object.keys(stack.instances || {})) {
				const queueName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'instance',
					resourceName: name,
				})
				resource.addType(name, `Send<'${queueName}'>`)
				mock.addType(name, `MockBuilder`)
				mockResponse.addType(name, `MockObject`)
			}

			resources.addType(stack.name, resource)
			mocks.addType(stack.name, mock)
			mockResponses.addType(stack.name, mockResponse)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('InstanceResources', resources)
		gen.addInterface('InstanceMock', mocks)
		gen.addInterface('InstanceMockResponse', mockResponses)

		await ctx.write('instance.d.ts', gen, true)
	},
	onBefore(ctx) {
		const group = new Group(ctx.base, 'instance', 'asset')

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			bucket: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'instance',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			forceDestroy: true,
		})

		ctx.shared.set('instance', 'bucket-name', bucket.bucket)
	},
	onApp(ctx) {
		const found = ctx.stackConfigs.filter(stack => {
			return Object.keys(stack.instances ?? {}).length > 0
		})

		if (found.length === 0) {
			return
		}

		// ------------------------------------------------------------
		// Create the ECS cluster

		const group = new Group(ctx.base, 'instance', 'cluster')

		const cluster = new aws.ecs.Cluster(
			group,
			'cluster',
			{
				name: `${ctx.app.name}-instance`,
			},
			{
				replaceOnChanges: ['name'],
			}
		)

		ctx.shared.set('instance', 'cluster-name', cluster.name)
		ctx.shared.set('instance', 'cluster-arn', cluster.arn)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.instances ?? {})) {
			const group = new Group(ctx.stack, 'instance', id)
			const task = createFargateTask(group, ctx, 'instance', id, props)

			// ------------------------------------------------------------

			const queue = new aws.sqs.Queue(group, 'queue', {
				name: task.name,
				visibilityTimeoutSeconds: toSeconds(seconds(30)),
				messageRetentionSeconds: toSeconds(days(4)),
				maxMessageSize: toBytes(kibibytes(256)),
				receiveWaitTimeSeconds: toSeconds(seconds(20)),
			})

			task.addPermission({
				actions: [
					'sqs:ReceiveMessage',
					'sqs:DeleteMessage',
					'sqs:ChangeMessageVisibility',
					'sqs:GetQueueAttributes',
					'sqs:GetQueueUrl',
				],
				resources: [queue.arn],
			})

			ctx.addStackPermission({
				actions: ['sqs:SendMessage', 'sqs:GetQueueUrl', 'sqs:GetQueueAttributes'],
				resources: [queue.arn],
			})

			ctx.addEnv(`INSTANCE_${constantCase(ctx.stackConfig.name)}_${constantCase(id)}_URL`, queue.url)
		}
	},
})
