import { snakeCase } from 'change-case'
// import { DataSource } from '../formation/data-source.ts'
import { Group } from '../formation/group.ts'
import { Config, createMeta, State } from '../formation/meta.ts'
import { Node } from '../formation/node.ts'
import { Resource, ResourceConfig } from '../formation/resource.ts'

declare global {
	export namespace $terraform {}
}

type Global = typeof globalThis
type GlobalType<T> = T extends keyof Global ? Global[T] : any

const createNamespaceProxy = (cb: (key: string) => unknown, target = {}) => {
	const cache = new Map<string, unknown>()
	return new Proxy(target, {
		get(_, key: string) {
			if (!cache.has(key)) {
				cache.set(key, cb(key))
			}

			return cache.get(key)
		},
		set(_, key: string) {
			throw new Error(`Cannot assign to ${key} because it is a read-only property.`)
		},
	})
}

// type Construct = (
//   names: string[],
//   parent: Group,
//   id: string,
//   input: State,
//   config?: ResourceConfig
// ) => object;

// type Get = (logicalId: string, physicalId: string) => object

const createClassProxy = (construct: (...args: any[]) => object, get: (...args: any[]) => object) => {
	return new Proxy(class {}, {
		construct(_, args) {
			return construct(...args)
		},
		get(_, key) {
			if (key === 'get') {
				return (...args: any[]) => {
					return get(...args)
				}
			}

			return
		},
	})
}

const createRecursiveProxy = ({
	resource,
	dataSource,
}: {
	resource: (ns: string[], ...args: any[]) => object
	dataSource: (ns: string[], ...args: any[]) => object
}) => {
	const createProxy = (names: string[]): any => {
		return createNamespaceProxy(name => {
			const ns = [...names, name]
			if (name === name.toLowerCase()) {
				return createProxy(ns)
			} else if (name.startsWith('get')) {
				return (...args: any[]) => {
					return dataSource([...names, name.substring(3)], ...args)
				}
			} else {
				return createClassProxy(
					(...args) => {
						return resource(ns, ...args)
					},
					(...args) => {
						return dataSource(ns, ...args)
					}
				)
			}
		})
	}

	return createProxy([])
}

export namespace $ {}

// export type $ = $terraform

// export declare namespace $ = $terraform

export const $ = createRecursiveProxy({
	resource: (ns: string[], parent: Group, id: string, input: State, config?: ResourceConfig) => {
		const type = snakeCase(ns.join('_'))
		const provider = `terraform:${ns[0]}:${config?.provider ?? 'default'}`
		const $ = createMeta('resource', provider, parent, type, id, input, config)
		const resource = createNamespaceProxy(
			key => {
				if (key === '$') {
					return $
				}

				return $.output(data => data[key])
			},
			{ $ }
		) as Resource

		// $.attach(resource)

		parent.add(resource)

		return resource
	},
	// external: (ns: string[], id: string, input: State, config?: ResourceConfig) => {
	// 	const type = snakeCase(ns.join('_'))
	// 	const provider = `terraform:${ns[0]}:${config?.provider ?? 'default'}`
	// 	const $ = createResourceMeta(provider, type, id, input, config)
	// 	const resource = createNamespaceProxy(
	// 		key => {
	// 			if (key === '$') {
	// 				return $
	// 			}

	// 			return $.output(data => data[key])
	// 		},
	// 		{ $ }
	// 	) as Resource

	// 	parent.add(resource)

	// 	return resource
	// },
	// (ns: string[], parent: Group, id: string, input: State, config?: ResourceConfig)
	dataSource: (ns: string[], parent: Group, id: string, input: State, config?: Config) => {
		const type = snakeCase(ns.join('_'))
		const provider = `terraform:${ns[0]}:${config?.provider ?? 'default'}`

		console.log('INPUT', ns, parent, id, input, config)

		const $ = createMeta('data', provider, parent, type, id, input, config)

		const dataSource = createNamespaceProxy(
			key => {
				if (key === '$') {
					return $
				}

				return $.output(data => data[key])
			},
			{ $ }
		) as Node

		parent.add(dataSource)

		return dataSource
	},
}) as GlobalType<'$terraform'>
