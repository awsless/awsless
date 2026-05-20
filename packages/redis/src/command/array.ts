import { InputValue, RedisClient } from '../type'
import { del as deleteKey } from './key'
import { command, iterable, removeNull, returnBoolean, returnEcho, returnInt, returnVoid } from './util'

/**
 * Get the value at a list index.
 *
 * @command LINDEX
 * @complexity O(N) where N is the distance from the closest end of the list
 * @speed slow
 * @since 1.0.0
 */
export const at = (client: RedisClient, key: string, index: number) => {
	return command<string | undefined, string | null>(client, 'LINDEX', [key, index], removeNull)
}

/**
 * Check whether a list contains a value.
 *
 * @command LPOS
 * @complexity O(N) where N is the number of elements in the list
 * @speed slow
 * @since 6.0.6
 */
export const has = (client: RedisClient, key: string, value: InputValue) => {
	return command<boolean, null | number>(client, 'LPOS', [key, value], r => r !== null)
}

/**
 * Find the index of a value in a list.
 *
 * @command LPOS
 * @complexity O(N) where N is the number of elements in the list
 * @speed slow
 * @since 6.0.6
 */
export const indexOf = (client: RedisClient, key: string, value: InputValue) => {
	return command<undefined | number, null | string>(client, 'LPOS', [key, value], r =>
		r === null ? undefined : parseInt(r, 10)
	)
}

/**
 * Replace the value at a list index.
 *
 * @command LSET
 * @complexity O(N) where N is the length of the list
 * @speed slow
 * @since 1.0.0
 */
export const replace = (client: RedisClient, key: string, index: number, value: InputValue) => {
	return command<void, string>(client, 'LSET', [key, index, value], returnVoid)
}

const insert = (
	client: RedisClient,
	key: string,
	position: 'BEFORE' | 'AFTER',
	pivot: InputValue,
	value: InputValue
) => {
	return command<number, string>(client, 'LINSERT', [key, position, pivot, value], returnInt)
}

/**
 * Insert a value before a pivot value in a list.
 *
 * @command LINSERT
 * @complexity O(N) where N is the number of elements to traverse before seeing the pivot value
 * @speed slow
 * @since 2.2.0
 */
export const insertBefore = (client: RedisClient, key: string, pivot: InputValue, value: InputValue) => {
	return insert(client, key, 'BEFORE', pivot, value)
}

/**
 * Insert a value after a pivot value in a list.
 *
 * @command LINSERT
 * @complexity O(N) where N is the number of elements to traverse before seeing the pivot value
 * @speed slow
 * @since 2.2.0
 */
export const insertAfter = (client: RedisClient, key: string, pivot: InputValue, value: InputValue) => {
	return insert(client, key, 'AFTER', pivot, value)
}

/**
 * Append one or more values to the end of a list.
 *
 * @command RPUSH
 * @complexity O(1) for each element added
 * @speed fast
 * @since 1.0.0
 */
export const append = (client: RedisClient, key: string, ...elements: InputValue[]) => {
	return command<number, string>(client, 'RPUSH', [key, ...elements], returnInt)
}

/**
 * Prepend one or more values to the start of a list.
 *
 * @command LPUSH
 * @complexity O(1) for each element added
 * @speed fast
 * @since 1.0.0
 */
export const prepend = (client: RedisClient, key: string, ...elements: InputValue[]) => {
	// @ts-ignore
	const revElements = elements.toReversed()

	return command<number, string>(client, 'LPUSH', [key, ...revElements], returnInt)
}

/**
 * Remove and return the last item from a list.
 *
 * @command RPOP
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const pop = (client: RedisClient, key: string) => {
	return command<undefined | string, null | string>(client, 'RPOP', [key], removeNull)
}

/**
 * Remove and return the first item from a list.
 *
 * @command LPOP
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const shift = (client: RedisClient, key: string) => {
	return command<undefined | string, null | string>(client, 'LPOP', [key], removeNull)
}

/**
 * Remove matching values from a list.
 *
 * @command LREM
 * @complexity O(N+M) where N is the length of the list and M is the number of removed elements
 * @speed slow
 * @since 1.0.0
 */
const del = (client: RedisClient, key: string, value: InputValue, options: { count?: number } = {}) => {
	return command<number, string>(client, 'LREM', [key, options.count ?? 0, value], returnInt)
}

export { del as delete }

/**
 * Trim a list to the specified start and end range.
 *
 * @command LTRIM
 * @complexity O(N) where N is the number of elements to be removed
 * @speed slow
 * @since 1.0.0
 */
export const trim = (client: RedisClient, key: string, start: number, end: number) => {
	return command<boolean, number>(client, 'LTRIM', [key, start, end], returnBoolean)
}

/**
 * Get the number of items in a list.
 *
 * @command LLEN
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const length = (client: RedisClient, key: string) => {
	return command<number, string>(client, 'LLEN', [key], returnInt)
}

/**
 * Delete a list key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
export const clear = deleteKey

/**
 * Get a range of values from a list.
 *
 * @command LRANGE
 * @complexity O(S+N) where S is the distance of start offset and N is the number of elements in the specified range
 * @speed slow
 * @since 1.0.0
 */
export const range = (client: RedisClient, key: string, start: number, end: number) => {
	return command<string[], string[]>(client, 'LRANGE', [key, start, end], returnEcho)
}

/**
 * Get all values from a list.
 *
 * @command LRANGE
 * @complexity O(N) where N is the number of elements in the list
 * @speed slow
 * @since 2.1.0
 */
export const all = (client: RedisClient, key: string) => {
	return range(client, key, 0, -1)
}

/**
 * Iterate through a list in fixed-size ranges.
 *
 * @command LRANGE
 * @complexity O(S+N) where S is the distance of start offset and N is the number of elements in the specified range
 * @speed slow
 * @since 1.0.0
 */
export const scan = (client: RedisClient, key: string, options: { cursor?: number; limit?: number } = {}) => {
	const cursor = options.cursor ?? 0
	const limit = options.limit ?? 10

	const formatScanResult = (cursor: number, items: string[]) => {
		if (items.length < limit) {
			return {
				cursor: undefined,
				items: items,
			}
		}

		return {
			cursor: cursor + limit,
			items,
		}
	}

	return {
		...command<{ cursor: number | undefined; items: string[] }, string[]>(
			client,
			'LRANGE',
			[key, cursor, cursor + limit - 1],
			v => formatScanResult(cursor, v)
		),
		...iterable(cursor, async cursor => {
			const c = cursor ?? 0
			const result = await client.send('LRANGE', [key, c, c + limit - 1])

			return formatScanResult(c, result)
		}),
	}
}
