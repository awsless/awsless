import { createHash } from 'crypto'
import { cp } from 'fs/promises'
import { join } from 'path'
import { toDays } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { kebabCase } from 'change-case'
import { glob } from 'glob'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { getCacheControl, getContentType } from '../../util/content.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { formatRouteKey, registerBundleFunction } from '../bundle/util.js'

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

const formatEventRouteKey = (stackName: string, id: string, event: string) => {
	return formatRouteKey(stackName, 'store', kebabCase(`${id}-${shortId(event)}`))
}

// S3 caps bucket names at 63 chars. Too long names swap the stack & id
// for a hash, keeping the "--store--" shape the permission wildcard needs.
// Must match getStoreName in the awsless runtime.
export const getStoreName = (appName: string, stackName: string, id: string, appId: string) => {
	const name = formatLocalResourceName({
		appName,
		stackName,
		resourceType: 'store',
		resourceName: id,
		postfix: appId,
	})

	if (name.length <= 63) {
		return name
	}

	return formatGlobalResourceName({
		appName,
		resourceType: shortHash(`${kebabCase(stackName)}:${kebabCase(id)}`),
		resourceName: 'store',
		postfix: appId,
	})
}

const shortHash = (value: string) => {
	return createHash('md5').update(value).digest('hex').substring(0, 16)
}

export const storeFeature = defineFeature({
	name: 'store',
	async onDev(ctx) {
		const stores = ctx.stackConfigs.flatMap(stack => Object.entries(stack.stores ?? {}))

		if (stores.length === 0) {
			return
		}

		// The shared s3 server hosts every store bucket - this feature
		// contributes its notification rules & its declared static files.
		const shared = await ctx.useStore()

		for (const stack of ctx.stackConfigs) {
			for (const [id, props] of Object.entries(stack.stores ?? {})) {
				const bucket = getStoreName(ctx.appConfig.name, stack.name, id, ctx.appId)

				ctx.registerResource({
					kind: 'store',
					stack: stack.name,
					id,
					detail: bucket,
				})

				for (const event of Object.keys(props.events ?? {})) {
					shared.rules.push({
						id: formatEventRouteKey(stack.name, id, event),
						events: [eventMap[event]!],
						bucket,
					})
				}

				// The static files exist locally like the deploy uploads them,
				// so Store.has/get find them.
				if (typeof props.static === 'string') {
					await cp(props.static, join(directories.output, 'local', 'store', bucket), {
						recursive: true,
						force: true,
					})
				}
			}
		}
	},
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
		const name = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: '*',
			resourceType: 'store',
			resourceName: '*',
		})

		ctx.addPermission({
			actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:GetObjectAttributes'],
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
		for (const [id, props] of Object.entries(ctx.stackConfig.stores ?? {})) {
			const group = new Group(ctx.stack, 'store', id)
			const name = getStoreName(ctx.app.name, ctx.stack.name, id, ctx.appId)

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
				if (typeof props.static === 'string') {
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

			// ------------------------------------------------------------
			// Event notification consumers

			const events = Object.entries(props.events ?? {})

			if (events.length === 0) {
				continue
			}

			for (const [event, taskProps] of events) {
				registerBundleFunction(ctx, formatEventRouteKey(ctx.stack.name, id, event), taskProps.consumer)
			}

			// A bucket holds a single notification config, so all events
			// of the store share one.
			const bundle = ctx.shared.get('bundle', 'main')
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
					bucket: bucket.bucket,
					lambdaFunction: events.map(([event]) => ({
						id: formatEventRouteKey(ctx.stack.name, id, event),
						events: [eventMap[event]!],
						lambdaFunctionArn: bundle.alias.arn,
					})),
				},
				{ dependsOn: [permission] }
			)
		}
	},
})
