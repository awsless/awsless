import { $, Group } from '@awsless/formation'
import { defineFeature } from '../../feature'
import { formatGlobalResourceName } from '../../util/name'
import { createFargateTask } from './util'

export const instanceFeature = defineFeature({
	name: 'instance',
	onBefore(ctx) {
		const group = new Group(ctx.base, 'instance', 'asset')

		const bucket = new $.aws.s3.Bucket(group, 'bucket', {
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

		const cluster = new $.aws.ecs.Cluster(group, 'cluster', {
			name: ctx.app.name,
		})

		ctx.shared.set('instance', 'cluster-name', cluster.name)
		ctx.shared.set('instance', 'cluster-arn', cluster.arn)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.instances ?? {})) {
			const group = new Group(ctx.stack, 'instance', id)
			createFargateTask(group, ctx, 'instance', id, props)
		}
	},
})
