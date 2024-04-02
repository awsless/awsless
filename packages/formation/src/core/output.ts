// import { Resource } from './resource'

import { Resource } from './resource'

export type Input<T> = T | Output<T>

export class Output<T> {
	// protected resources = new Set<Resource>()
	// protected deps = new Set<Resource>()
	protected listeners = new Set<(value: T) => unknown>()
	protected value: T | undefined
	protected resolved = false

	constructor(readonly resources: Resource[], cb: (resolve: (data: T) => void) => void) {
		cb(value => {
			if (!this.resolved) {
				this.value = value
				this.resolved = true

				for (const listener of this.listeners) {
					listener(value)
				}
			} else {
				throw new Error(`Output values can only be resolved once.`)
			}
		})
	}

	apply<N>(cb: (value: T) => N) {
		return new Output<N>(this.resources, resolve => {
			if (!this.resolved) {
				this.listeners.add(value => {
					resolve(cb(value))
				})
			} else {
				cb(this.value as T)
			}
		})
	}

	valueOf() {
		if (!this.resolved) {
			throw new TypeError(`Output hasn't been resolved yet.`)
		}

		return this.value
	}
}

export const findResources = (props: unknown) => {
	const resources: Resource[] = []
	const find = (props: unknown) => {
		if (props instanceof Output) {
			resources.push(...props.resources)
		} else if (props instanceof Resource) {
			resources.push(props)
		} else if (Array.isArray(props)) {
			props.map(find)
		} else if (props?.constructor === Object) {
			Object.values(props).map(find)
		}
	}

	find(props)

	return resources
}

export const all = <I extends [Input<any>, ...Input<any>]>(inputs: I): Output<UnwrapArray<I>> => {
	return new Output(findResources(inputs), resolve => {
		let count = inputs.length
		const done = () => {
			if (--count === 0) {
				resolve(inputs.map(unwrap) as UnwrapArray<I>)
			}
		}

		for (const input of inputs) {
			if (input instanceof Output) {
				input.apply(done)
			} else {
				done()
			}
		}
	})
}

// export const wrap = <T>(value: T): Output<Unwrap<T>> => {
// 	if (value instanceof Output) {
// 		return value
// 	}

// 	return new Output(findResources(value), resolve => {
// 		resolve(value as Unwrap<T>)
// 	})
// }

export type UnwrapArray<T extends Input<unknown>[]> = {
	[K in keyof T]: Unwrap<T[K]>
}

export type Unwrap<T> = T extends Output<infer V> ? V : T

export function unwrap<T extends Input<unknown>>(input: T): Unwrap<T>
export function unwrap<T extends Input<unknown>>(input: T, defaultValue: Unwrap<T>): Exclude<Unwrap<T>, undefined>
export function unwrap<T extends Input<unknown>>(input: T, defaultValue?: Unwrap<T>) {
	if (typeof input === 'undefined') {
		return defaultValue
	}

	if (input instanceof Output) {
		return input.valueOf()
	}

	return input
}

// export const deepUnwrap = <T extends Input<V>, V>(input: T, defaultValue: Unwrap<T>): Unwrap<T> => {
// 	if (typeof input === 'undefined') {
// 		return defaultValue
// 	}

// 	if (input instanceof Output) {
// 		return input.toJSON()
// 	}

// 	return input as Unwrap<T>
// }

// const t1 = unwrap(wrap<boolean | undefined>(true), true)
// const t2 = unwrap(wrap<boolean | undefined>(true))
// const t3 = unwrap(wrap(true), true)
// const t4 = unwrap(wrap(true))

// deepUnwrap({ a: wrap(1) }, { a: 1 })

// const id = new Output<number | string | undefined>([], resolve => {
// 	resolve(1)
// })

// class Lol<T> {
// 	constructor() {

// 	}
// }

// type T = string | undefined
// const lol = new Lol<T>
// const lol = (p: Input<Input<string>[]>) => {}

// lol([])
// lol([''])
// lol([new Output<string>([], () => {})])
// lol(new Output<string[]>([], () => {}))
// lol(new Output<Input<string>[]>([], () => {}))
