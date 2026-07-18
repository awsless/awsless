import { toDays } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group, Output } from '@terraforge/core'
import { kebabCase } from 'change-case'
import { glob } from 'glob'
import { join } from 'path'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatRouteKey, registerBundleFunction } from '../bundle/util.js'
import { getCacheControl, getContentType } from './util.js'

const typeGenCode = `
import { Body, PutObjectProps, BodyStream } from '@awsless/s3'

type Store = {
	readonly name: string
	readonly put: (key: string, body: Body, options?: Pick<PutObjectProps, 'metadata' | 'storageClass'>) => Promise<void>
	readonly get: (key: string) => Promise<BodyStream | undefined>
	readonly has: (key: string) => Promise<boolean>
	readonly delete: (key: string) => Promise<void>
}
`

export type BucketLifecycleRule = {
	id: string
	enabled: boolean
	prefix?: string
	expiration?: { days: number }
	noncurrentVersionExpiration?: { days: number }
}

export type BucketNotificationRule = {
	id: string
	events: string[]
	filterPrefix: string
}

// Every feature stores its files inside one shared app bucket,
// namespaced by a folder per feature.
export const getFeatureFolder = (feature: string, stackName: string, resourceName: string) => {
	return `${feature}/${kebabCase(stackName)}/${kebabCase(resourceName)}/`
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
	onBefore(ctx) {
		const group = new Group(ctx.base, 'store', 'asset')
		const name = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: 'store',
			resourceName: 'assets',
			postfix: ctx.appId,
		})

		const lifecycleRules: BucketLifecycleRule[] = [
			{
				id: 'expire-noncurrent',
				enabled: true,
				noncurrentVersionExpiration: { days: 30 },
			},
		]

		const notificationRules: BucketNotificationRule[] = []

		const bucket = new aws.s3.Bucket(
			group,
			'bucket',
			{
				bucket: name,
				versioning: {
					enabled: true,
				},
				forceDestroy: true,
				corsRule: [
					// Presigned post uploads & browser reads through CloudFront.
					{
						allowedOrigins: ['*'],
						allowedMethods: ['POST'],
					},
					{
						allowedOrigins: ['*'],
						allowedHeaders: ['*'],
						allowedMethods: ['GET', 'HEAD'],
						exposeHeaders: ['content-type', 'cache-control'],
					},
				],
				lifecycleRule: new Output(new Set(), (resolve: (value: BucketLifecycleRule[]) => void) => {
					resolve(lifecycleRules)
				}) as aws.s3.BucketInput['lifecycleRule'],
			},
			{
				retainOnDelete: ctx.appConfig.removal === 'retain',
				import: ctx.import ? name : undefined,
			}
		)

		// Any distribution in the account may read the public site assets.
		const policy = new aws.s3.BucketPolicy(group, 'policy', {
			bucket: bucket.bucket,
			policy: bucket.arn.pipe(arn =>
				JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Action: 's3:GetObject',
							Resource: `${arn}/site/*`,
							Principal: {
								Service: 'cloudfront.amazonaws.com',
							},
							Condition: {
								StringEquals: {
									'AWS:SourceAccount': ctx.accountId,
								},
							},
						},
					],
				})
			),
		})

		ctx.shared.set('store', 'bucket', {
			name: bucket.bucket,
			arn: bucket.arn,
			regionalDomainName: bucket.bucketRegionalDomainName,
			policy,
			addLifecycleRule(rule) {
				lifecycleRules.push(rule)
			},
			addNotification(rule) {
				notificationRules.push(rule)
			},
			notificationRules,
		})
	},
	onApp(ctx) {
		const bucket = ctx.shared.get('store', 'bucket')

		ctx.addAppPermission({
			actions: [
				's3:ListBucket',
				's3:GetObject',
				's3:PutObject',
				's3:DeleteObject',
				's3:GetObjectAttributes',
			],
			resources: [
				//
				bucket.arn,
				bucket.arn.pipe(arn => `${arn}/*`),
			],
			conditions: {
				StringEquals: {
					// This will protect anyone from taking our bucket name,
					// and us sending our items to the wrong s3 bucket
					's3:ResourceAccount': ctx.accountId,
				},
			},
		})

		// The store events of every stack share one bucket notification.
		ctx.onReadyLast(() => {
			if (bucket.notificationRules.length === 0) {
				return
			}

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
					lambdaFunction: bucket.notificationRules.map(rule => ({
						...rule,
						lambdaFunctionArn: bundle.alias.arn,
					})),
				},
				{ dependsOn: [permission] }
			)
		})
	},
	onStack(ctx) {
		const bucket = ctx.shared.get('store', 'bucket')

		for (const [id, props] of Object.entries(ctx.stackConfig.stores ?? {})) {
			const group = new Group(ctx.stack, 'store', id)
			const folder = getFeatureFolder('store', ctx.stack.name, id)

			for (const [index, rule] of Object.entries(props.lifecycle ?? [])) {
				bucket.addLifecycleRule({
					id: rule.prefix ? `expire-${kebabCase(`${id}-${rule.prefix}`)}` : `expire-${id}-rule-${index}`,
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
						new aws.s3.BucketObject(group, file, {
							bucket: bucket.name,
							key: `${folder}${file}`,
							cacheControl: getCacheControl(file),
							contentType: getContentType(file),
							source: join(props.static, file),
							sourceHash: $hash(join(props.static, file)),
						})
					}
				}
			})

			// ---------------------------------------------
			// Event notifications
			// ---------------------------------------------

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

			for (const [event, taskProps] of Object.entries(props.events ?? {})) {
				const eventId = kebabCase(`${id}-${shortId(event)}`)
				const routeKey = formatRouteKey(ctx.stack.name, 'store', eventId)

				registerBundleFunction(ctx, routeKey, taskProps.consumer)

				bucket.addNotification({
					id: routeKey,
					events: [eventMap[event]!],
					filterPrefix: folder,
				})
			}
		}
	},
})
