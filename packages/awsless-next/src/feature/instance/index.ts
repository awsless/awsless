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

		// ------------------------------------------------------
		// Define the Repository used to store the container images.

		// const repository = new $.aws.ecr.Repository(group, 'repository', {
		// 	name: formatGlobalResourceName({
		// 		appName: ctx.app.name,
		// 		resourceType: 'function',
		// 		resourceName: 'repository',
		// 		seperator: '-',
		// 	}),
		// 	imageTagMutability: 'MUTABLE',
		// })

		// new $.aws.ecr.LifecyclePolicy(group, 'lifecycle', {
		// 	repository: repository.name,
		// 	policy: JSON.stringify({
		// 		rules: [
		// 			{
		// 				rulePriority: 1,
		// 				description: 'Remove untagged images older then 1 day',
		// 				action: {
		// 					type: 'expire',
		// 				},
		// 				selection: {
		// 					tagStatus: 'untagged',
		// 					countType: 'sinceImagePushed',
		// 					countNumber: 1,
		// 					countUnit: 'days',
		// 				},
		// 			},
		// 		],
		// 	}),
		// })

		// ctx.shared.set('function-repository-name', repository.name)
		// ctx.shared.set('function-repository-uri', repository.repositoryUrl)
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

		ctx.shared.set('instance', 'cluster-arn', cluster.arn)

		// ------------------------------------------------------------
		// Create Cloud Map namespace for service discovery

		const namespace = new $.aws.service.DiscoveryPrivateDnsNamespace(group, 'namespace', {
			name: ctx.app.name,
			vpc: ctx.shared.get('vpc', 'id'),
			description: `Private DNS namespace for ${ctx.app.name}`,
		})

		ctx.shared.set('instance', 'namespace', namespace.name)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.instances ?? {})) {
			const group = new Group(ctx.stack, 'instance', id)
			createFargateTask(group, ctx, 'instance', id, props)
		}
	},
})
