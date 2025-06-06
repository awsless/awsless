import { Future } from './future.ts'
import { Meta } from './meta.ts'
import { Output } from './output.ts'

export type Input<T = unknown> = T | Output<T> | Future<T> | Promise<T>
export type OptionalInput<T = unknown> = Input<T> | Input<T | undefined> | Input<undefined>

export type UnwrapInputArray<T extends Input[]> = {
	[K in keyof T]: UnwrapInput<T[K]>
}

export type UnwrapInput<T> = T extends Input<infer V> ? V : T

// export const findUnresolvedInputs = (props: unknown) => {
//   const inputs: Array<Output | Future | Promise<unknown>> = [];

//   const find = (props: unknown) => {
//     if (
//       props instanceof Output ||
//       props instanceof Future ||
//       props instanceof Promise
//     ) {
//       inputs.push(props);
//     } else if (Array.isArray(props)) {
//       props.map(find);
//     } else if (props?.constructor === Object) {
//       Object.values(props).map(find);
//     }
//   };

//   find(props);

//   return inputs;
// };

export const findInputDeps = (props: unknown) => {
	const deps: Array<Meta> = []

	const find = (props: unknown) => {
		if (props instanceof Output) {
			deps.push(...props.dependencies)
		} else if (Array.isArray(props)) {
			props.map(find)
		} else if (props?.constructor === Object) {
			Object.values(props).map(find)
		}
	}

	find(props)

	return deps
}

export const resolveInputs = async <T>(inputs: T): Promise<T> => {
	const unresolved: [any, string | number][] = []

	const find = (props: any, parent: any, key: number | string) => {
		if (props instanceof Output || props instanceof Future || props instanceof Promise) {
			unresolved.push([parent, key])
		} else if (Array.isArray(props)) {
			props.map((value, index) => find(value, props, index))
		} else if (props?.constructor === Object) {
			Object.entries(props).map(([key, value]) => find(value, props, key))
		}
	}

	find(inputs, {}, 'root')

	const responses = await Promise.all(
		unresolved.map(async ([obj, key]) => {
			const promise = obj[key]
			let timeout
			const response = await Promise.race([
				promise,
				new Promise((_, reject) => {
					timeout = setTimeout(() => {
						if (promise instanceof Output) {
							reject(
								new Error(
									`Resolving Output<${[...promise.dependencies].map(d => d.urn).join(', ')}> took too long.`
								)
							)
						} else if (promise instanceof Future) {
							reject(new Error('Resolving Future took too long.'))
						} else {
							reject(new Error('Resolving Promise took too long.'))
						}
					}, 3000)
				}),
			])

			clearTimeout(timeout)
			return response
		})
	)

	// const responses = (await Promise.race([
	// 	new Promise((_, reject) =>
	// 		setTimeout(() => {
	// 			reject(new Error('Resolving inputs took too long.'))
	// 		}, 3000)
	// 	),
	// ])) as any[]

	// const responses = (await Promise.race([
	// 	Promise.all(unresolved.map(([obj, key]) => obj[key])),
	// 	new Promise((_, reject) =>
	// 		setTimeout(() => {
	// 			reject(new Error('Resolving inputs took too long.'))
	// 		}, 3000)
	// 	),
	// ])) as any[]

	// const responses = await Promise.all(unresolved.map(([obj, key]) => obj[key]))

	unresolved.forEach(([props, key], i) => {
		props[key] = responses[i]
	})

	return inputs
}

// function promiseRecursive(obj) {
//     const getPromises = obj =>
//         Object.keys(obj).reduce( (acc, key) =>
//             Object(obj[key]) !== obj[key]
//                 ? acc
//                 : acc.concat(
//                     typeof obj[key].then === "function"
//                         ? [[obj, key]]
//                         : getPromises(obj[key])
//                   )
//         , []);
//     const all = getPromises(obj);
//     return Promise.all(all.map(([obj, key]) => obj[key])).then( responses =>
//         (all.forEach( ([obj, key], i) => obj[key] = responses[i]), obj)
//     );
// }
