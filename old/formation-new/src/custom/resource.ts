import { Group } from '../formation/group'
import { createMeta, State } from '../formation/meta'
import { Resource, ResourceClass, ResourceConfig } from '../formation/resource'

export const createCustomResourceClass = <I extends State, O extends State>(
	providerId: string,
	resourceType: string
) => {
	return new Proxy(class {}, {
		construct(_, [parent, id, input, config]: [Group, string, State, ResourceConfig]) {
			const $ = createMeta('resource', `custom:${providerId}`, parent, resourceType, id, input, config)
			const node = new Proxy(
				{ $ },
				{
					get(_, key: string) {
						if (key === '$') {
							return $
						}

						return $.output(data => data[key])
					},
				}
			) as Resource

			parent.add(node)

			return node
		},
		// get(_, key: string) {
		// 	if (key === 'get') {
		// 		return (...args: any[]) => {
		// 			return get(...args)
		// 		}
		// 	}

		// 	return
		// },
	}) as unknown as ResourceClass<I, O>
}

// type InvalidateCacheProps = {
// 	path: string
// 	versions: string[]
// }

// const InvalidateCache = createCustomNodeClass<InvalidateCacheProps, {}>('custom', 'resource', 'invalidate-cache')

// const provider = createCustomProvider('custom', {
// 	'invalidate-cache': {
// 		async updateResource(state: InvalidateCacheProps) {
// 			console.log('invalidate', state.path)
// 			return {}
// 		},
// 	},
// })

// const app = new App('lol')
// const stack = new Stack(app, 'lol')
// const cache = new InvalidateCache(stack, 'id', {
// 	versions: [],
// 	path: '/*',
// })
