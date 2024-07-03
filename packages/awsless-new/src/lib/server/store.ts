import { Body, deleteObject, getObject, headObject, putObject, StorageClass } from '@awsless/s3'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName } from './util.js'

export const getStoreName = bindLocalResourceName('store')

export interface StoreResources {}

type Options = {
	metadata?: Record<string, string>
	storageClass?: StorageClass
}

export const Store: StoreResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const bucket = getStoreName(name, stack)
		return {
			name: bucket,
			async put(key: string, body: Body, options: Options = {}) {
				await putObject({
					bucket,
					key,
					body,
					...options,
				})
			},
			async get(key: string) {
				const object = await getObject({ bucket, key })
				if (object) {
					return object.body
				}

				return undefined
			},
			async has(key: string) {
				const object = await headObject({ bucket, key })
				return !!object
			},
			delete(key: string) {
				return deleteObject({ bucket, key })
			},
		}
	})
})
