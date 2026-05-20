import { RedisClient } from '../type'
import { command, returnVoid } from './util'

/**
 * Remove all keys from all databases.
 *
 * @command FLUSHALL
 * @complexity O(N) where N is the total number of keys in all databases
 * @speed slow
 * @dangerous
 * @since 1.0.0
 */
export const flushAll = (client: RedisClient, mode: 'sync' | 'async' = 'async') => {
	return command<void, 'OK'>(client, 'FLUSHALL', [mode.toUpperCase()], returnVoid)
}

/**
 * Get the Redis server time as a Date.
 *
 * @command TIME
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
export const time = (client: RedisClient) => {
	return command<Date, [string, string]>(client, 'TIME', [], ([sec, micro]) => {
		return new Date(parseInt(sec, 10) * 1000 + Math.floor(parseInt(micro, 10) / 1000))
	})
}

/**
 * Swap the contents of two databases.
 *
 * @command SWAPDB
 * @complexity O(N) where N is the count of clients watching or blocking on keys from both databases
 * @speed fast
 * @dangerous
 * @since 4.0.0
 */
export const swap = (client: RedisClient, db1: number, db2: number) => {
	return command<void, 'OK'>(client, 'SWAPDB', [db1, db2], returnVoid)
}
