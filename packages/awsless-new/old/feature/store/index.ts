import { definePlugin } from '../../feature.js'
import { Bucket } from '../../formation/resource/s3/bucket.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { formatName } from '../../formation/util.js'
import { CustomResource } from '../../formation/resource/cloud-formation/custom-resource.js'
import { Config } from '../../config/config.js'

export const hasStores = (config: Config) => {
	const stores = config.stacks.find(stack => {
		// @ts-ignore
		return typeof stack.stores !== 'undefined'
	})

	return !!stores
}

const typeGenCode = `
import { Body, PutObjectProps, BodyStream } from '@awsless/s3'

type Store<Name extends string> = {
	readonly name: Name
	readonly put: (key: string, body: Body, options?: Pick<PutObjectProps, 'metadata' | 'storageClass'>) => Promise<void>
	readonly get: (key: string) => Promise<BodyStream | undefined>
	readonly delete: (key: string) => Promise<void>
}
`

export const storePlugin = definePlugin({
	name: 'store',
	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of config.stacks) {
			const list = new TypeObject(2)

			for (const name of stack.stores || []) {
				const storeName = formatName(`${config.app.name}-${stack.name}-${name}`)
				list.addType(name, `Store<'${storeName}'>`)
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('StoreResources', resources)

		await write('store.d.ts', gen, true)
	},
	onStack({ config, stack, stackConfig, bootstrap, bind }) {
		for (const id of stackConfig.stores || []) {
			const bucket = new Bucket(id, {
				name: `store-${config.app.name}-${stack.name}-${id}`,
				accessControl: 'private',
				cors: [
					// ---------------------------------------------
					// support for presigned post requests
					// ---------------------------------------------
					{
						origins: ['*'],
						methods: ['POST'],
					},
					// ---------------------------------------------
				],
			})

			const custom = new CustomResource(id, {
				serviceToken: bootstrap.import('feature-delete-bucket'),
				properties: {
					bucketName: bucket.name,
				},
			}).dependsOn(bucket)

			stack.add(bucket, custom)

			bind(lambda => {
				lambda.addPermissions(bucket.permissions)
			})
		}
	},
})
