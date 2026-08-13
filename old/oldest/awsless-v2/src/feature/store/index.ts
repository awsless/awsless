import { aws, Node, Output } from '@awsless/formation'
import { paramCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatLocalResourceName } from '../../util/name.js'
import { createAsyncLambdaFunction } from '../function/util.js'

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
		const gen = new TypeFile('@awsless/awsless')
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
		ctx.onAppPolicy(policy => {
			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: '*',
				resourceType: 'store',
				resourceName: '*',
			})

			policy.addStatement({
				actions: [
					's3:ListBucket',
					's3:ListBucketV2',
					's3:HeadObject',
					's3:GetObject',
					's3:PutObject',
					's3:DeleteObject',
					's3:CopyObject',
					's3:GetObjectAttributes',
				],
				resources: [
					//
					`arn:aws:s3:::${name}`,
					`arn:aws:s3:::${name}/*`,
				],
			})
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.stores ?? {})) {
			const group = new Node(ctx.stack, 'store', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'store',
				resourceName: id,
				postfix: ctx.appId,
			})

			const lambdaConfigs: {
				event: aws.s3.NotifictionEvent
				function: Output<aws.ARN>
			}[] = []

			const eventMap: Record<keyof typeof props.events, aws.s3.NotifictionEvent> = {
				'created:*': 's3:ObjectCreated:*',
				'created:put': 's3:ObjectCreated:Put',
				'created:post': 's3:ObjectCreated:Post',
				'created:copy': 's3:ObjectCreated:Copy',
				'created:upload': 's3:ObjectCreated:CompleteMultipartUpload',

				'removed:*': 's3:ObjectRemoved:*',
				'removed:delete': 's3:ObjectRemoved:Delete',
				'removed:marker': 's3:ObjectRemoved:DeleteMarkerCreated',
			}

			for (const [event, funcProps] of Object.entries(props.events ?? {})) {
				const eventGroup = new Node(group, 'event', event)

				const eventId = paramCase(`${id}-${shortId(event)}`)

				const { lambda } = createAsyncLambdaFunction(eventGroup, ctx, `store`, eventId, {
					...funcProps,
					description: `${id} event "${event}"`,
				})

				new aws.lambda.Permission(eventGroup, 'permission', {
					action: 'lambda:InvokeFunction',
					principal: 's3.amazonaws.com',
					functionArn: lambda.arn,
					sourceArn: `arn:aws:s3:::${name}`,
				})

				lambdaConfigs.push({
					event: eventMap[event as keyof typeof props.events],
					function: lambda.arn,
				})
			}

			const bucket = new aws.s3.Bucket(group, 'store', {
				name,
				versioning: props.versioning,
				forceDelete: true,
				lambdaConfigs,
				cors: [
					// ---------------------------------------------
					// Support for presigned post requests
					// ---------------------------------------------
					{
						origins: ['*'],
						methods: ['POST'],
					},
					// ---------------------------------------------
				],
			})

			// ---------------------------------------------
			// Deletion protection

			const deletionProtection = props.deletionProtection ?? ctx.appConfig.defaults.store?.deletionProtection

			if (deletionProtection) {
				bucket.deletionPolicy = 'retain'
			}

			ctx.onStackPolicy(policy => {
				policy.addStatement(bucket.permissions)
			})
		}
	},
})
