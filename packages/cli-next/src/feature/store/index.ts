import { Group } from '@terraforge/core'
import { toDays } from '@awsless/duration'
import { kebabCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatLocalResourceName } from '../../util/name.js'
import { formatRouteKey, parseExportName } from '../bundle/util.js'
import { aws } from '@terraforge/aws'
import { glob } from 'glob'
import { getCacheControl, getContentType } from './util.js'
import { join } from 'path'

const typeGenCode = `
import { Body, PutObjectProps, BodyStream } from '@awsless/s3'

type Store<Name extends string> = {
	readonly name: Name
	readonly put: (key: string, body: Body, options?: Pick<PutObjectProps, 'metadata' | 'storageClass'>) => Promise<void>
	readonly get: (key: string) => Promise<BodyStream | undefined>
	readonly has: (key: string) => Promise<boolean>
	readonly delete: (key: string) => Promise<void>
}
`

export const storeFeature = defineFeature({
	name: 'store',
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)

			for (const id of Object.keys(stack.stores ?? {})) {
				const storeName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'store',
					resourceName: id,
				})

				list.addType(id, `Store<'${storeName}'>`)
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('StoreResources', resources)

		await ctx.write('store.d.ts', gen, true)
	},
	onApp(ctx) {
		const name = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: '*',
			resourceType: 'store',
			resourceName: '*',
		})

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
				`arn:aws:s3:::${name}`,
				`arn:aws:s3:::${name}/*`,
			],
			conditions: {
				StringEquals: {
					// This will protect anyone from taking our bucket name,
					// and us sending our items to the wrong s3 bucket
					's3:ResourceAccount': ctx.accountId,
				},
			},
		})
	},
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		for (const [id, props] of Object.entries(ctx.stackConfig.stores ?? {})) {
			const group = new Group(ctx.stack, 'store', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'store',
				resourceName: id,
				postfix: ctx.appId,
			})

			const lifecycleRule = props.lifecycle?.map((rule, index) => ({
				id: rule.prefix ? `expire-${kebabCase(rule.prefix)}` : `expire-rule-${index}`,
				enabled: true,
				...(rule.prefix ? { prefix: rule.prefix } : {}),
				expiration: { days: toDays(rule.expiration) },
			}))

			const bucket = new aws.s3.Bucket(
				group,
				'store',
				{
					bucket: name,
					versioning: {
						enabled: props.versioning,
					},
					forceDestroy: true,
					corsRule: [
						// ---------------------------------------------
						// Support for presigned post requests
						{
							allowedOrigins: ['*'],
							allowedMethods: ['POST'],
						},
					],
					...(lifecycleRule?.length ? { lifecycleRule } : {}),
				},
				{
					retainOnDelete: ctx.appConfig.removal === 'retain',
					import: ctx.import ? name : undefined,
				}
			)

			// ------------------------------------------------------------
			// Get all static files

			ctx.onReady(() => {
				if (typeof props.static === 'string' && bucket) {
					const files = glob.sync('**', {
						cwd: props.static,
						nodir: true,
					})

					for (const file of files) {
						new aws.s3.BucketObject(group, file, {
							bucket: bucket.bucket,
							key: file,
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

			const notifications: {
				id: string
				events: string[]
				lambdaFunctionArn: typeof bundle.alias.arn
			}[] = []

			for (const [event, taskProps] of Object.entries(props.events ?? {})) {
				const eventId = kebabCase(`${id}-${shortId(event)}`)
				const routeKey = formatRouteKey(ctx.stack.name, 'store', eventId)
				const consumer = taskProps.consumer

				bundle.addHandler({
					routeKey,
					file: consumer.code.file,
					exportName: parseExportName(consumer.handler ?? ctx.appConfig.defaults.function.handler!),
					external: consumer.code.external,
					importAsString: consumer.code.importAsString,
				})

				for (const [name, value] of Object.entries(consumer.environment ?? {})) {
					bundle.addEnv(name, value)
				}

				for (const permission of consumer.permissions ?? []) {
					bundle.addPermission(permission)
				}

				notifications.push({
					id: routeKey,
					events: [eventMap[event]!],
					lambdaFunctionArn: bundle.alias.arn,
				})
			}

			if (notifications.length > 0) {
				const permission = new aws.lambda.Permission(group, 'permission', {
					action: 'lambda:InvokeFunction',
					principal: 's3.amazonaws.com',
					functionName: bundle.lambda.functionName,
					qualifier: bundle.alias.name,
					sourceAccount: ctx.accountId,
					sourceArn: `arn:aws:s3:::${name}`,
				})

				new aws.s3.BucketNotification(
					group,
					'notification',
					{
						bucket: bucket.bucket,
						lambdaFunction: notifications,
					},
					{ dependsOn: [permission] }
				)
			}

			ctx.addStackPermission({
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
		}
	},
})
