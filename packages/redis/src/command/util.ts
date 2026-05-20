import { Command, InputValue, RedisClient } from '../type'

export const removeNull = <T>(value: T): Exclude<T, null> | undefined => {
	if (value === null) {
		return undefined
	}

	return value as Exclude<T, null>
}

export const returnVoid = () => {}
export const returnEcho = <T>(v: T): T => v
export const returnBoolean = (v: number) => !!v
export const returnNumberBoolean = (v: number | string) => v === 1 || v === '1'
export const returnInt = (v: string) => parseInt(v, 10)
export const returnFloat = (v: string) => parseFloat(v)
export const returnScanResult = <T>([cursor, items]: [string, T[]]) => {
	if (cursor === '0') {
		return {
			cursor: undefined,
			items,
		}
	}

	return {
		cursor,
		items,
	}
}

export type ScanOptions = { match?: string; limit?: number; cursor?: string }

export const buildScanArgs = ({ match, limit, cursor }: ScanOptions) => {
	const args: Array<string | number> = []

	args.push(cursor ?? 0)

	args.push('COUNT', limit ?? 10)

	if (match) {
		args.push('MATCH', match)
	}

	return args
}

export const command = <T, R>(
	redis: RedisClient,
	name: string,
	args: (InputValue | undefined)[],
	resolve: (response: R) => T
): Command<T, R> => {
	let promise: Promise<T> | undefined

	return {
		name,
		args,
		resolve,
		then(onfulfilled, onrejected) {
			if (!promise) {
				promise = redis.send(name, args).then(resolve)
			}

			return promise.then(onfulfilled).catch(onrejected)
		},
	}
}

export const iterable = <C extends string | number, T>(
	cursor: C | undefined,
	callback: (cursor?: C) => Promise<{ cursor?: C; items: T }>
) => {
	return {
		[Symbol.asyncIterator]() {
			let done = false

			return {
				async next(): Promise<{ done: true } | { done: false; value: T }> {
					if (done) {
						return { done: true }
					}

					const result = await callback(cursor)

					cursor = result.cursor

					if (!result.cursor) {
						done = true
					}

					if (Array.isArray(result.items) && result.items.length === 0) {
						return { done: true }
					}

					if ((result.items instanceof Set || result.items instanceof Map) && result.items.size === 0) {
						return { done: true }
					}

					return {
						value: result.items,
						done: false,
					}
				},
			}
		},
	}
}
