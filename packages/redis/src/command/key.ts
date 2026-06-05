import { RedisClient } from '../type'
import {
	buildScanArgs,
	command,
	returnBoolean,
	returnEcho,
	returnNumberBoolean,
	returnScanResult,
	ScanOptions,
} from './util'

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
const del = (client: RedisClient, key: string) => {
	return command<boolean, number>(client, 'DEL', [key], returnBoolean)
}

export { del as delete }

/**
 * Delete a key asynchronously.
 *
 * @command UNLINK
 * @complexity O(1) for each key removed from the keyspace. The actual memory reclaiming happens asynchronously
 * @speed fast
 * @since 4.0.0
 */
export const asyncDelete = (client: RedisClient, key: string) => {
	return command<boolean, number>(client, 'UNLINK', [key], returnBoolean)
}

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

const formatScanResult = (result: [string, string[]]) => {
	return returnScanResult(result)
}

/**
 * Iterate through keys in the current database.
 *
 * @command SCAN
 * @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
 * @speed slow
 * @since 2.8.0
 */
export const scan = (client: RedisClient, options: ScanOptions = {}) => {
	// SCAN cursor [MATCH pattern] [COUNT count]

	return {
		...command<{ cursor: string | undefined; items: string[] }, [string, string[]]>(
			client,
			'SCAN',
			buildScanArgs(options),
			formatScanResult
		),
		[Symbol.asyncIterator]() {
			let cursor = options.cursor
			let done = false

			return {
				async next(): Promise<{ done: true } | { done: false; value: string[] }> {
					while (!done) {
						const result = await client.send<[string, string[]]>(
							'SCAN',
							buildScanArgs({ ...options, cursor })
						)
						const formatted = formatScanResult(result)

						cursor = formatted.cursor

						if (!formatted.cursor) {
							done = true
						}

						if (formatted.items.length > 0) {
							return {
								value: formatted.items,
								done: false,
							}
						}
					}

					return { done: true }
				},
			}
		},
	}
}
