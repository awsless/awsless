import { Command, InputValue, RedisClient } from '../type'
import { del as deleteKey } from './key'
import {
	buildScanArgs,
	command,
	iterable,
	removeNull,
	returnBoolean,
	returnInt,
	returnScanResult,
	ScanOptions,
} from './util'

const returnSet = (r: string[]) => new Set(r)

/**
 * Add one or more values to a set.
 *
 * @command SADD
 * @complexity O(N) where N is the number of members to be added
 * @speed fast
 * @since 1.0.0
 */
export const add = (client: RedisClient, key: string, ...values: [InputValue, ...InputValue[]]) => {
	return command<number, string>(client, 'SADD', [key, ...values], returnInt)
}

/**
 * Remove one or more values from a set.
 *
 * @command SREM
 * @complexity O(N) where N is the number of members to be removed
 * @speed fast
 * @since 1.0.0
 */
const del = (client: RedisClient, key: string, ...values: [InputValue, ...InputValue[]]) => {
	return command<number, string>(client, 'SREM', [key, ...values], returnInt)
}

export { del as delete }

/**
 * Check whether a set contains a value.
 *
 * @command SISMEMBER
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const has = (client: RedisClient, key: string, value: InputValue) => {
	return command<boolean, number>(client, 'SISMEMBER', [key, value], returnBoolean)
}

// export const intersection = (client: RedisClient, ...keys: [string, string, ...string[]]) => {
// 	return command<Set<string>, string[]>(client, 'SINTER', [...keys], returnSet)
// }

// export const union = (client: RedisClient, ...keys: [string, string, ...string[]]) => {
// 	return command<Set<string>, string[]>(client, 'SUNION', [...keys], returnSet)
// }

// export const difference = (client: RedisClient, ...keys: [string, string, ...string[]]) => {
// 	return command<Set<string>, string[]>(client, 'SDIFF', [...keys], returnSet)
// }

/**
 * Get one or more random values from a set without removing them.
 *
 * @command SRANDMEMBER
 * @complexity Without the count argument O(1), otherwise O(N) where N is the absolute value of the passed count
 * @speed slow
 * @since 1.0.0
 */
export function random(client: RedisClient, key: string): Command<string | undefined, string | null>
export function random(client: RedisClient, key: string, count: number): Command<Set<string>, string[]>
export function random(client: RedisClient, key: string, count?: number) {
	return command<any, any>(client, 'SRANDMEMBER', [key, count], typeof count !== 'undefined' ? returnSet : removeNull)
}

/**
 * Remove and return one or more random values from a set.
 *
 * @command SPOP
 * @complexity Without the count argument O(1), otherwise O(N) where N is the value of the passed count
 * @speed fast
 * @since 1.0.0
 */
export function pop(client: RedisClient, key: string): Command<string | undefined, string | null>
export function pop(client: RedisClient, key: string, count: number): Command<Set<string>, string[]>
export function pop(client: RedisClient, key: string, count?: number) {
	return command<any, any>(client, 'SPOP', [key, count], typeof count !== 'undefined' ? returnSet : removeNull)
}

/**
 * Get the number of values in a set.
 *
 * @command SCARD
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const length = (client: RedisClient, key: string) => {
	return command<number, string>(client, 'SCARD', [key], returnInt)
}

/**
 * Delete a set key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
export const clear = deleteKey

/**
 * Get all values from a set.
 *
 * @command SMEMBERS
 * @complexity O(N) where N is the set cardinality
 * @speed slow
 * @since 2.1.0
 */
export const all = (client: RedisClient, key: string) => {
	return command<Set<string>, string[]>(client, 'SMEMBERS', [key], returnSet)
}

const formatScanResult = (result: [string, string[]]) => {
	const { cursor, items } = returnScanResult(result)

	return {
		cursor,
		items: new Set(items),
	}
}

/**
 * Iterate through set values.
 *
 * @command SSCAN
 * @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
 * @speed slow
 * @since 2.8.0
 */
export const scan = (client: RedisClient, key: string, options: ScanOptions = {}) => {
	// SSCAN key cursor [MATCH pattern] [COUNT count]

	return {
		...command<{ cursor: string | undefined; items: Set<string> }, [string, string[]]>(
			client,
			'SSCAN',
			[key, ...buildScanArgs(options)],
			formatScanResult
		),
		...iterable(options.cursor, async cursor => {
			const result = await client.send('SSCAN', [key, ...buildScanArgs({ ...options, cursor })])
			return formatScanResult(result)
		}),
	}
}
