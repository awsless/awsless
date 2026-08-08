import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { kebabCase } from 'change-case'
import { glob } from 'glob'
import { join } from 'path'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { toDays } from '@awsless/duration'
import { getFeatureFolder } from '../asset/index.js'
import { formatRouteKey, registerBundleFunction } from '../bundle/util.js'
import { getCacheControl, getContentType } from '../../util/content.js'

const typeGenCode = `
import { Body, PutObjectProps, BodyStream } from '@awsless/s3'

type Store = {
	readonly name: string
	readonly folder: string
	readonly put: (key: string, body: Body, options?: Pick<PutObjectProps, 'metadata' | 'storageClass'>) => Promise<void>
	readonly get: (key: string) => Promise<BodyStream | undefined>
	readonly has: (key: string) => Promise<boolean>
	readonly delete: (key: string) => Promise<void>
}
`

const eventMap: Record<string, string> = {
	'created:*': 's3:ObjectCreated:*',
	'created:put': 's3:ObjectCreated:Put',
	'created:post': 's3:ObjectCreated:Post',
	'created:copy': 's3:ObjectCreated:Copy',
	'created:upload': 's3:ObjectCreated:CompleteMultipartUpload',

	'removed:*': 's3:ObjectRemoved:*',
	'removed:delete': 's3:ObjectRemoved:Delete',
	'removed:marker': 's3:ObjectRemoved:DeleteMarkerCreated',
}

export const storeFeature = defineFeature({
	name: 'store',
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)

			for (const id of Object.keys(stack.stores ?? {})) {
				list.addType(id, `Store`)
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('StoreResources', resources)

		await ctx.write('store.d.ts', gen, true)
	},
	onApp(ctx) {
		// The store events of every stack share one bucket notification.
		const notificationRules = ctx.stackConfigs.flatMap(stack => {
			return Object.entries(stack.stores ?? {}).flatMap(([id, props]) => {
				const folder = getFeatureFolder('store', stack.name, id)

				return Object.keys(props.events ?? {}).map(event => {
					const eventId = kebabCase(`${id}-${shortId(event)}`)

					return {
						id: formatRouteKey(stack.name, 'store', eventId),
						events: [eventMap[event]!],
						filterPrefix: folder,
					}
				})
			})
		})

		if (notificationRules.length === 0) {
			return
		}

		const bucket = ctx.shared.get('asset', 'bucket')

		ctx.onReadyLast(() => {
			const bundle = ctx.shared.get('bundle', 'main')
			const group = new Group(ctx.base, 'store', 'events')
			const permission = new aws.lambda.Permission(group, 'permission', {
				action: 'lambda:InvokeFunction',
				principal: 's3.amazonaws.com',
				functionName: bundle.lambda.functionName,
				qualifier: bundle.alias.name,
				sourceAccount: ctx.accountId,
				sourceArn: bucket.arn,
			})

			new aws.s3.BucketNotification(
				group,
				'notification',
				{
					bucket: bucket.name,
					lambdaFunction: notificationRules.map(rule => ({
						...rule,
						lambdaFunctionArn: bundle.alias.arn,
					})),
				},
				{ dependsOn: [permission] }
			)
		})
	},
	onStack(ctx) {
		const bucket = ctx.shared.get('asset', 'bucket')

		for (const [id, props] of Object.entries(ctx.stackConfig.stores ?? {})) {
			const group = new Group(ctx.stack, 'store', id)
			const folder = getFeatureFolder('store', ctx.stack.name, id)

			for (const [index, rule] of Object.entries(props.lifecycle ?? [])) {
				bucket.addLifecycleRule({
					// The folder scopes the rule id, since all stacks share one bucket.
					id: `expire-${kebabCase(`${folder}${rule.prefix ?? `rule-${index}`}`)}`,
					enabled: true,
					prefix: `${folder}${rule.prefix ?? ''}`,
					expiration: { days: toDays(rule.expiration) },
				})
			}

			// ------------------------------------------------------------
			// Get all static files

			ctx.onReady(() => {
				if (typeof props.static === 'string') {
					const files = glob.sync('**', {
						cwd: props.static,
						nodir: true,
					})

					for (const file of files) {
						new aws.s3.BucketObject(
							group,
							file,
							{
								bucket: bucket.name,
								key: `${folder}${file}`,
								cacheControl: getCacheControl(file),
								contentType: getContentType(file),
								source: join(props.static, file),
								sourceHash: $hash(join(props.static, file)),
							},
							{
								replaceOnChanges: ['bucket', 'key'],
							}
						)
					}
				}
			})

			// ------------------------------------------------------------
			// Event notification consumers

			for (const [event, taskProps] of Object.entries(props.events ?? {})) {
				const eventId = kebabCase(`${id}-${shortId(event)}`)
				const routeKey = formatRouteKey(ctx.stack.name, 'store', eventId)

				registerBundleFunction(ctx, routeKey, taskProps.consumer)
			}
		}
	},
})
