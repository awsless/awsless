import { RedisClient } from '../type'
import { command, returnBoolean, returnEcho, returnNumberBoolean } from './util'

export type KeyType = 'none' | 'string' | 'list' | 'set' | 'zset' | 'hash' | 'stream'

/**
 * Check whether a key exists.
 *
 * @command EXISTS
 * @complexity O(N) where N is the number of keys to check
 * @speed fast
 * @since 1.0.0
 */
export const has = (client: RedisClient, key: string) => {
	return command<boolean, number | string>(client, 'EXISTS', [key], returnNumberBoolean)
}

/**
 * Delete a key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
export const del = (client: RedisClient, key: string) => {
	return command<boolean, number>(client, 'DEL', [key], returnBoolean)
}

export { del as delete }

/**
 * Get the type of value stored at a key.
 *
 * @command TYPE
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const type = (client: RedisClient, key: string) => {
	return command<KeyType, KeyType>(client, 'TYPE', [key], returnEcho)
}

/**
 * Rename a key.
 *
 * @command RENAME | RENAMENX
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const rename = (
	client: RedisClient,
	from: string,
	to: string,
	options: {
		when?: 'not-exists'
	} = {}
) => {
	if (options.when === 'not-exists') {
		return command<boolean, number | string>(client, 'RENAMENX', [from, to], returnNumberBoolean)
	}

	return command<boolean, string>(client, 'RENAME', [from, to], () => {
		return true
	})
}
