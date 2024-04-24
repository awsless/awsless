import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'

const typeGenCode = `
import { Body, PutObjectProps, BodyStream } from '@awsless/s3'

type Store<Name extends string> = {
	readonly name: Name
	readonly put: (key: string, body: Body, options?: Pick<PutObjectProps, 'metadata' | 'storageClass'>) => Promise<void>
	readonly get: (key: string) => Promise<BodyStream | undefined>
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

			for (const name of stack.stores || []) {
				const storeName = formatLocalResourceName(ctx.appConfig.name, stack.name, 'store', name)
				list.addType(name, `Store<'${storeName}'>`)
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('StoreResources', resources)

		await ctx.write('store.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const id of ctx.stackConfig.stores || []) {
			const group = new Node(ctx.stack, 'store', id)

			const bucket = new aws.s3.Bucket(group, 'store', {
				name: formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, 'store', id),
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

			ctx.onFunction(({ policy }) => {
				policy.addStatement(bucket.permissions)
			})
		}
	},
})
