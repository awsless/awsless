import { Duration, milliSeconds, toSafeMilliSeconds } from '@awsless/duration'
import { InputValue, RedisClient } from '../type'
import { command, returnBoolean } from './util'

/**
 * Set or update the expiration for a string key.
 *
 * @command PEXPIRE | PEXPIREAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
export const set = (
	client: RedisClient,
	key: string,
	ttl: Duration | Date
	// options: {
	// 	when: 'no-expiry' | 'has-expiry' | 'gt' | 'lt'
	// }
) => {
	const isDate = ttl instanceof Date
	const cmd = isDate ? 'PEXPIREAT' : 'PEXPIRE'
	const args: InputValue[] = [key]

	if (isDate) {
		args.push(ttl.getTime())
	} else {
		args.push(toSafeMilliSeconds(ttl).toString())
	}

	// switch (options.when) {
	// 	case "no-expiry"
	// }
	//

	return command<boolean, number>(client, cmd, args, returnBoolean)
}

/**
 * Get the expiration date for a string key.
 *
 * @command PEXPIRETIME
 * @complexity O(1)
 * @speed fast
 * @since 7.0.0
 */
export const get = (client: RedisClient, key: string) => {
	return command<Date | undefined, number>(client, 'PEXPIRETIME', [key], r => {
		if (r < 0) {
			return undefined
		}

		return new Date(r)
	})
}

/**
 * Get the remaining TTL duration for a string key.
 *
 * @command PTTL
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
export const duration = (client: RedisClient, key: string) => {
	return command<Duration | undefined, number>(client, 'PTTL', [key], r => {
		if (r < 0) {
			return undefined
		}

		return milliSeconds(r)
	})
}

/**
 * Remove the expiration from a string key.
 *
 * @command PERSIST
 * @complexity O(1)
 * @speed fast
 * @since 2.2.0
 */
const persist = (client: RedisClient, key: string) => {
	return command<boolean, number>(client, 'PERSIST', [key], returnBoolean)
}

export { persist as delete }
