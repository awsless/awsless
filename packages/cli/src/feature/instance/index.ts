import { days, seconds, toSeconds } from '@awsless/duration'
import { kibibytes, toBytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { plainTestMockTypes, writeResourceTypes } from '../../type-gen/snippets.js'
import { formatLocalResourceName } from '../../util/name.js'
import { instanceOnDev } from './dev.js'
import { createFargateTask } from './util.js'

const typeGenCode = `
import { SendMessageOptions } from '@awsless/sqs'
import type { Mock } from 'vitest'

type Send<Name extends string> = {
	readonly name: Name
	(payload: unknown, options?: Omit<SendMessageOptions, 'queue' | 'payload' | 'groupId' | 'deduplicationId'>): Promise<void>
}
${plainTestMockTypes()}`

export const instanceFeature = defineFeature({
	name: 'instance',
	onDev: instanceOnDev,
	async onTypeGen(ctx) {
		await writeResourceTypes(ctx, {
			kind: 'instance',
			interfaceName: 'InstanceResources',
			code: typeGenCode,
			stacks(stack, add) {
				for (const name of Object.keys(stack.instances || {})) {
					const queueName = formatLocalResourceName({
						appName: ctx.appConfig.name,
						stackName: stack.name,
						resourceType: 'instance',
						resourceName: name,
					})

					add(name, `Send<'${queueName}'>`, `TestMockEntry`)
				}
			},
		})
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
