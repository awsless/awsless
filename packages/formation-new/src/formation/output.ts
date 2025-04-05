import { DataSourceMeta } from './data-source.ts'
import { Future } from './future.ts'
import { Input, UnwrapInputArray } from './input.ts'
import { ResourceMeta } from './resource.ts'

export class Output<T = unknown> extends Future<T> {
	constructor(
		readonly dependencies: Set<ResourceMeta | DataSourceMeta>,
		callback: (resolve: (data: T) => void, reject: (error: unknown) => void) => void
	) {
		super(callback)
	}

	pipe<N>(cb: (value: T) => N) {
		return new Output<Awaited<N>>(this.dependencies, (resolve, reject) => {
			this.then(value => {
				Promise.resolve(cb(value))
					.then(value => {
						resolve(value)
					})
					.catch(reject)
			}, reject)
		})
	}
}

// export interface OutputInstance<T = unknown> {
// 	pipe: <N>(cb: (value: T) => N) => OutputInstance<Awaited<N>>
// 	then: (resolve: (data: T) => void, reject?: (error: unknown) => void) => void
// }

// factories

export const deferredOutput = <T>(cb: (resolve: (data: T) => void) => void) => {
	return new Output<T>(new Set(), cb)
}

export const output = <T>(value: T) => {
	return deferredOutput<T>(resolve => resolve(value))
}

// helpers

// export const findOutputs = (props: unknown) => {
//   const outputs: Output[] = [];
//   const find = (props: unknown) => {
//     if (props instanceof Output) {
//       outputs.push(props);
//     } else if (Array.isArray(props)) {
//       props.map(find);
//     } else if (props?.constructor === Object) {
//       Object.values(props).map(find);
//     }
//   };

//   find(props);

//   return outputs;
// };

export const combine = <T extends Input[], R = UnwrapInputArray<T>>(...inputs: T): Output<R> => {
	// const unresolved = findUnresolvedInputs(inputs);
	const deps = new Set(...inputs.filter(o => o instanceof Output).map(o => o.dependencies))

	return new Output<R>(deps, (resolve, reject) => {
		Promise.all(inputs).then(result => {
			resolve(result as R)
		}, reject)
	})
}

export const resolve = <T extends [Input, ...Input[]], R>(
	inputs: T,
	transformer: (...inputs: UnwrapInputArray<T>) => R
): Output<Awaited<R>> => {
	return combine(...inputs).pipe(data => {
		return transformer(...data)
	})
}

export const interpolate = (literals: TemplateStringsArray, ...placeholders: Input<any>[]): Output<string> => {
	return combine(...placeholders).pipe(unwrapped => {
		const result: string[] = []

		for (let i = 0; i < unwrapped.length; i++) {
			result.push(literals[i]!, unwrapped[i])
		}

		result.push(literals.at(-1)!)
		return result.join('')
	})
}
