// import { camelCase } from 'change-case'
// import { relative } from 'path'
// import { FunctionSchema } from './schema.js'
import { aws, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { days } from '@awsless/duration'

export const layerFeature = defineFeature({
	name: 'layer',
	onBefore(ctx) {
		const group = new Node(ctx.base, 'function', 'asset')

		// ------------------------------------------------------

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'function',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			// versioning: true,
			forceDelete: true,
		})

		ctx.shared.set('function-bucket-name', bucket.name)

		// ------------------------------------------------------

		const repository = new aws.ecr.Repository(group, 'repository', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'function',
				resourceName: 'repository',
				seperator: '-',
			}),
			imageTagMutability: true,
		})

		repository.addLifecycleRule({
			description: 'Remove untagged images older then 1 day',
			tagStatus: 'untagged',
			maxImageAge: days(1),
		})

		ctx.shared.set('function-repository-name', repository.name)
		ctx.shared.set('function-repository-uri', repository.uri)
	},
	onApp(ctx) {
		// ------------------------------------------------------
		// Give lambda access to all policies inside your app.

		ctx.onGlobalPolicy(policy => {
			policy.addStatement({
				actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
				resources: [`arn:aws:lambda:*:*:function:${ctx.appConfig.name}--*`],
			})
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.functions || {})) {
			const group = new Node(ctx.stack, 'function', id)
			createLambdaFunction(group, ctx, 'function', id, props)
		}
	},
})
