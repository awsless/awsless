import { days, seconds, toSeconds } from '@awsless/duration'
import { kibibytes, toBytes } from '@awsless/size'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name'
import { instanceOnDev } from './dev.js'
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

// Calling overrides the implementation & the same value works as the
// vitest mock inside expect().
type TestMockEntry = MockBuilder & MockObject
`

export const instanceFeature = defineFeature({
	name: 'instance',
	onDev: instanceOnDev,
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)
		const testMocks = new TypeObject(2)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const testMock = new TypeObject(3)

			for (const name of Object.keys(stack.instances || {})) {
				const queueName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'instance',
					resourceName: name,
				})
				resource.addType(name, `Send<'${queueName}'>`)
				testMock.addType(name, `TestMockEntry`)
			}

			resources.addType(stack.name, resource)
			testMocks.addType(stack.name, testMock)
		}

		const testMock = new TypeObject(1)
		testMock.addType('instance', testMocks)

		gen.addCode(typeGenCode)
		gen.addInterface('InstanceResources', resources)
		gen.addInterface('TestMock', testMock)

		await ctx.write('instance.d.ts', gen, true)
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
				import: ctx.import
					? `arn:aws:ecs:${ctx.appConfig.region}:${ctx.accountId}:cluster/${ctx.app.name}-instance`
					: undefined,
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

			const queue = new aws.sqs.Queue(
				group,
				'queue',
				{
					name: task.name,
					visibilityTimeoutSeconds: toSeconds(seconds(30)),
					messageRetentionSeconds: toSeconds(days(4)),
					maxMessageSize: toBytes(kibibytes(256)),
					receiveWaitTimeSeconds: toSeconds(seconds(20)),
				},
				{
					import: ctx.import
						? `https://sqs.${ctx.appConfig.region}.amazonaws.com/${ctx.accountId}/${task.name}`
						: undefined,
				}
			)

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

			ctx.addPermission({
				actions: ['sqs:SendMessage', 'sqs:GetQueueUrl', 'sqs:GetQueueAttributes'],
				resources: [queue.arn],
			})

			ctx.addEnv(`INSTANCE_${constantCase(ctx.stackConfig.name)}_${constantCase(id)}_URL`, queue.url)
		}
	},
})
