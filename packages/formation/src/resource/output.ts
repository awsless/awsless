// import { Resource } from './resource'

import { Resource } from './resource'

export type Input<T> = T | Output<T>

export class Output<T> {
	// protected resources = new Set<Resource>()
	// protected deps = new Set<Resource>()
	protected listeners = new Set<(value: T) => unknown>()
	protected value: T | undefined
	protected resolved = false

	constructor(readonly resource: Resource | undefined, cb: (resolve: (data: T) => void) => void) {
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
		return new Output<N>(this.resource, resolve => {
			if (!this.resolved) {
				this.listeners.add(value => {
					resolve(cb(value))
				})
			} else {
				cb(this.value as T)
			}
		})
	}

	toJSON() {
		if (!this.resolved) {
			throw new TypeError(`Output hasn't been resolved yet.`)
		}

		return this.value
	}
}

export const wrap = <T>(value: T): Output<Unwrap<T>> => {
	if (value instanceof Output) {
		return value
	}

	return new Output(undefined, resolve => {
		resolve(value as Unwrap<T>)
	})
}

export type Unwrap<T> = T extends Output<infer V> ? V : T

export function unwrap<T extends Input<unknown>>(input: T): Unwrap<T>
export function unwrap<T extends Input<unknown>>(input: T, defaultValue: Unwrap<T>): Exclude<Unwrap<T>, undefined>
export function unwrap<T extends Input<unknown>>(input: T, defaultValue?: Unwrap<T>) {
	if (typeof input === 'undefined') {
		return defaultValue
	}

	if (input instanceof Output) {
		return input.toJSON()
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

// const id = new Output<number>(resolve => {
// 	resolve(1)
// })
