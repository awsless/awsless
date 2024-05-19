import { Node, Output, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { createLambdaFunction } from '../function/util.js'

const typeGenCode = `
import { Body, PutObjectProps, BodyStream, createPresignedPost } from '@awsless/s3'
import { Size } from '@awsless/size'
import { Duration } from '@awsless/duration'
import { PresignedPost } from '@aws-sdk/s3-presigned-post'

type Store<Name extends string> = {
	readonly name: Name
	readonly put: (key: string, body: Body, options?: Pick<PutObjectProps, 'metadata' | 'storageClass'>) => Promise<void>
	readonly get: (key: string) => Promise<BodyStream | undefined>
	readonly delete: (key: string) => Promise<void>
	readonly createPresignedPost: (key: string, contentLengthRange: [Size, Size], expires?: Duration, fields?: Record<string, string>) => Promise<PresignedPost>
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
				const storeName = formatLocalResourceName(ctx.appConfig.name, stack.name, 'store', id)
				list.addType(id, `Store<'${storeName}'>`)
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('StoreResources', resources)

		await ctx.write('store.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.stores ?? {})) {
			const group = new Node(ctx.stack, 'store', id)

			const lambdaConfigs: {
				event: 's3:ObjectCreated:*' | 's3:ObjectRemoved:*'
				function: Output<aws.ARN>
			}[] = []

			for (const [_, lambdaConfig] of Object.entries(props.lambdaConfigs ?? {})) {
				const { lambda } = createLambdaFunction(group, ctx, `store`, id, lambdaConfig.consumer)
				lambda.addEnvironment('LOG_VIEWABLE_ERROR', '1')

				let event: (typeof lambdaConfigs)[number]['event']
				if (lambdaConfig.event === 'created') {
					event = 's3:ObjectCreated:*'
				} else if (lambdaConfig.event === 'removed') {
					event = 's3:ObjectRemoved:*'
				}

				lambdaConfigs.push({
					event: event!,
					function: lambda.arn,
				})
			}

			const bucket = new aws.s3.Bucket(group, 'store', {
				name: formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, 'store', id),
				versioning: props.versioning,
				cors: props.cors,
				lambdaConfigs,

				// cors: [
				// 	// ---------------------------------------------
				// 	// Support for presigned post requests
				// 	// ---------------------------------------------
				// 	{
				// 		origins: ['*'],
				// 		methods: ['POST'],
				// 	},
				// 	// ---------------------------------------------
				// ],
			})

			ctx.onFunction(({ policy }) => {
				policy.addStatement(bucket.permissions)
			})
		}
	},
})
