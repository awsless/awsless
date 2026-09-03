import { Body, deleteObject, getObject, headObject, putObject, StorageClass } from '@awsless/s3'
import { kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { formatResourceName, getAppId } from './util.js'

// Every store lives as a folder inside the shared app bucket. Read at
// call time, since the CLI sets the app env after importing this module.
export const getStoreBucketName = () => {
	return formatResourceName({
		resourceType: 'store',
		resourceName: 'assets',
		postfix: getAppId(),
	})
}

export interface StoreResources {}

type Options = {
	metadata?: Record<string, string>
	storageClass?: StorageClass
}

export const Store: StoreResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const scoped = (key: string) => `store/${kebabCase(stack)}/${kebabCase(name)}/${key}`

		return {
			get name() {
				return getStoreBucketName()
			},
			// For callers building their own s3 requests inside the store's folder.
			folder: scoped(''),
			async put(key: string, body: Body, options: Options = {}) {
				await putObject({
					bucket: getStoreBucketName(),
					key: scoped(key),
					body,
					...options,
				})
			},
			async get(key: string) {
				const object = await getObject({ bucket: getStoreBucketName(), key: scoped(key) })
				if (object) {
					return object.body
				}

				return undefined
			},
			async has(key: string) {
				const object = await headObject({ bucket: getStoreBucketName(), key: scoped(key) })
				return !!object
			},
			delete(key: string) {
				return deleteObject({ bucket: getStoreBucketName(), key: scoped(key) })
			},
		}
	})
})
