import { createHash } from 'node:crypto'
import { Body, deleteObject, getObject, headObject, putObject, StorageClass } from '@awsless/s3'
import { kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { formatResourceName, getAppId, getStack } from './util.js'

// Every store owns its own bucket; read lazily for the CLI run command.
// Too long names fall back to a hash, like the CLI's getStoreName.
export const getStoreName = <N extends string, S extends string = ReturnType<typeof getStack>>(
	name: N,
	stack: S = getStack() as S
) => {
	const bucket = formatResourceName({
		stackName: stack,
		resourceType: 'store',
		resourceName: name,
		postfix: getAppId(),
	})

	if (bucket.length <= 63) {
		return bucket
	}

	const hash = createHash('md5')
		.update(`${kebabCase(stack)}:${kebabCase(name)}`)
		.digest('hex')
		.substring(0, 16)

	return formatResourceName({
		resourceType: hash,
		resourceName: 'store',
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
		return {
			get name() {
				return getStoreName(name, stack)
			},
			async put(key: string, body: Body, options: Options = {}) {
				await putObject({
					bucket: getStoreName(name, stack),
					key,
					body,
					...options,
				})
			},
			async get(key: string) {
				const object = await getObject({ bucket: getStoreName(name, stack), key })
				if (object) {
					return object.body
				}

				return undefined
			},
			async has(key: string) {
				const object = await headObject({ bucket: getStoreName(name, stack), key })
				return !!object
			},
			delete(key: string) {
				return deleteObject({ bucket: getStoreName(name, stack), key })
			},
		}
	})
})
