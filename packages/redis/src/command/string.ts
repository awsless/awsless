import { mul, Numeric, parse, StringNumericLiteral } from '@awsless/big-float'
import { Duration, toSafeMilliSeconds } from '@awsless/duration'
import { InputValue, RedisClient } from '../type'
import { del as deleteKey, has as hasKey } from './key'
import { command, removeNull, returnBoolean, returnEcho, returnInt } from './util'

/**
 * Get a string value by key.
 *
 * @command GET
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const get = (client: RedisClient, key: string) => {
	return command<string | undefined, string | null>(client, 'GET', [key], removeNull)
}

/**
 * Set a string value with optional TTL and existence conditions.
 *
 * @command SET
 * @complexity O(1)
 * @speed slow
 * @since 1.0.0
 */
export const set = (
	client: RedisClient,
	key: string,
	value: InputValue,
	options: {
		ttl?: Duration | Date | 'keep'
		when?: 'not-exists' | 'exists'
	} = {}
) => {
	const args = [key, value]

	if (options.when === 'exists') {
		args.push('XX')
	}

	if (options.when === 'not-exists') {
		args.push('NX')
	}

	if (options.ttl instanceof Date) {
		args.push('PXAT', options.ttl.getTime())
	}

	if (options.ttl instanceof Duration) {
		args.push('PX', toSafeMilliSeconds(options.ttl).toString())
	}

	if (options.ttl === 'keep') {
		args.push('KEEPTTL')
	}

	return command<boolean, number>(client, 'SET', args, returnBoolean)
}

/**
 * Check whether a key exists.
 *
 * @command EXISTS
 * @complexity O(N) where N is the number of keys to check
 * @speed fast
 * @since 1.0.0
 */
export const has = hasKey

/**
 * Increment a numeric string value by a given amount.
 *
 * @command INCRBYFLOAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
export const incr = (client: RedisClient, key: string, value: Numeric = 1) => {
	const num = parse(value).toString()
	return command<StringNumericLiteral, StringNumericLiteral>(client, 'INCRBYFLOAT', [key, num], returnEcho)
}

/**
 * Decrement a numeric string value by a given amount.
 *
 * @command INCRBYFLOAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
export const decr = (client: RedisClient, key: string, value: Numeric = 1) => {
	const num = mul(value, -1).toString()
	return command<StringNumericLiteral, StringNumericLiteral>(client, 'INCRBYFLOAT', [key, num], returnEcho)
}

/**
 * Append text to the end of a string value.
 *
 * @command APPEND
 * @complexity O(1). The amortized time complexity is O(1) assuming the appended value is small and the already present value is any size
 * @speed fast
 * @since 2.0.0
 */
export const append = (client: RedisClient, key: string, value: string) => {
	return command<number, string>(client, 'APPEND', [key, value], returnInt)
}

/**
 * Read a substring by start and end offsets.
 *
 * @command GETRANGE
 * @complexity O(N) where N is the length of the returned string
 * @speed slow
 * @since 2.4.0
 */
export const substring = (client: RedisClient, key: string, start: number, end: number = -1) => {
	return command<string, string>(client, 'GETRANGE', [key, start, end], returnEcho)
}

/**
 * Delete a key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
const del = deleteKey

export { del as delete }
