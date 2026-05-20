import { mul, Numeric, parse, StringNumericLiteral } from '@awsless/big-float'
import chunk from 'chunk'
import { InputValue, RedisClient } from '../type'
import { del as deleteKey } from './key'
import {
	buildScanArgs,
	command,
	iterable,
	removeNull,
	returnBoolean,
	returnEcho,
	returnInt,
	returnScanResult,
	ScanOptions,
} from './util'

export * as ttl from './map/ttl'

/**
 * Get a hash field value.
 *
 * @command HGET
 * @complexity O(1)
 * @speed fast
 * @since 2.0.0
 */
export const get = (client: RedisClient, key: string, field: string) => {
	return command<string | undefined, string | null>(client, 'HGET', [key, field], removeNull)
}

/**
 * Set a hash field value.
 *
 * @command HSET
 * @complexity O(1) for each field/value pair added
 * @speed fast
 * @since 2.0.0
 */
export const set = (client: RedisClient, key: string, field: string, value: InputValue) => {
	return command<boolean, number>(client, 'HSET', [key, field, value], returnBoolean)
}

/**
 * Check whether a hash field exists.
 *
 * @command HEXISTS
 * @complexity O(1)
 * @speed fast
 * @since 2.0.0
 */
export const has = (client: RedisClient, key: string, field: string) => {
	return command<boolean, number>(client, 'HEXISTS', [key, field], returnBoolean)
}

/**
 * Delete a field from a hash.
 *
 * @command HDEL
 * @complexity O(N) where N is the number of fields to be removed
 * @speed fast
 * @since 2.0.0
 */
const del = (client: RedisClient, key: string, field: string) => {
	return command<boolean, number>(client, 'HDEL', [key, field], returnBoolean)
}

export { del as delete }

/**
 * Increment a numeric hash field by a given amount.
 *
 * @command HINCRBYFLOAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
export const incr = (client: RedisClient, key: string, field: string, value: Numeric = 1) => {
	const num = parse(value).toString()
	return command<StringNumericLiteral, StringNumericLiteral>(client, 'HINCRBYFLOAT', [key, field, num], returnEcho)
}

/**
 * Decrement a numeric hash field by a given amount.
 *
 * @command HINCRBYFLOAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
export const decr = (client: RedisClient, key: string, field: string, value: Numeric = 1) => {
	const num = mul(value, -1).toString()
	return command<StringNumericLiteral, StringNumericLiteral>(client, 'HINCRBYFLOAT', [key, field, num], returnEcho)
}

/**
 * Get the number of fields in a hash.
 *
 * @command HLEN
 * @complexity O(1)
 * @speed fast
 * @since 2.0.0
 */
export const length = (client: RedisClient, key: string) => {
	return command<number, string>(client, 'HLEN', [key], returnInt)
}

/**
 * Delete an entire hash key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
export const clear = deleteKey

/**
 * Get all fields and values from a hash.
 *
 * @command HGETALL
 * @complexity O(N) where N is the size of the hash
 * @speed slow
 * @since 2.1.0
 */
export const all = (client: RedisClient, key: string) => {
	return command<Map<string, string>, string[]>(client, 'HGETALL', [key], items => new Map(chunk(items, 2) as [string, string][]))
}

const formatScanResult = (result: [string, string[]]) => {
	const { cursor, items } = returnScanResult(result)
	return {
		cursor,
		items: new Map(chunk(items, 2) as [string, string][]),
	}
}

/**
 * Iterate through hash fields and values.
 *
 * @command HSCAN
 * @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
 * @speed slow
 * @since 2.8.0
 */
export const scan = (client: RedisClient, key: string, options: ScanOptions = {}) => {
	// HSCAN key cursor [MATCH pattern] [COUNT count] [NOVALUES]

	return {
		...command<{ cursor: string | undefined; items: Map<string, string> }, [string, string[]]>(
			client,
			'HSCAN',
			[key, ...buildScanArgs(options)],
			formatScanResult
		),
		...iterable(options.cursor, async cursor => {
			const result = await client.send('HSCAN', [key, ...buildScanArgs({ ...options, cursor })])
			return formatScanResult(result)
		}),
	}
}
