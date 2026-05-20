import { RedisClient } from '../type'
import { command, returnInt, returnVoid } from './util'

/**
 * Remove all keys from the current database.
 *
 * @command FLUSHDB
 * @complexity O(N) where N is the number of keys in the selected database
 * @speed slow
 * @dangerous
 * @since 1.0.0
 */
export const flush = (client: RedisClient, mode: 'sync' | 'async' = 'async') => {
	return command<void, 'OK'>(client, 'FLUSHDB', [mode.toUpperCase()], returnVoid)
}

/**
 * Get the number of keys in the current database.
 *
 * @command DBSIZE
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
export const size = (client: RedisClient) => {
	return command<number, string>(client, 'DBSIZE', [], returnInt)
}
