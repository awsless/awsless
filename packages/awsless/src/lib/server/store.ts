import { Body, deleteObject, getObject, headObject, putObject, StorageClass } from '@awsless/s3'
import { kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { APP, APP_ID } from './util.js'

// Every store lives as a folder inside the shared app bucket.
const BUCKET = `${APP}--store--assets--${APP_ID}`

export interface StoreResources {}

type Options = {
	metadata?: Record<string, string>
	storageClass?: StorageClass
}

export const Store: StoreResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const scoped = (key: string) => `store/${kebabCase(stack)}/${kebabCase(name)}/${key}`

		return {
			name: BUCKET,
			async put(key: string, body: Body, options: Options = {}) {
				await putObject({
					bucket: BUCKET,
					key: scoped(key),
					body,
					...options,
				})
			},
			async get(key: string) {
				const object = await getObject({ bucket: BUCKET, key: scoped(key) })
				if (object) {
					return object.body
				}

				return undefined
			},
			async has(key: string) {
				const object = await headObject({ bucket: BUCKET, key: scoped(key) })
				return !!object
			},
			delete(key: string) {
				return deleteObject({ bucket: BUCKET, key: scoped(key) })
			},
		}
	})
})
