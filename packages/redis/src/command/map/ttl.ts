import { Duration, milliSeconds, toSafeMilliSeconds } from '@awsless/duration'
import { InputValue, RedisClient } from '../../type'
import { command, returnBoolean } from '../util'

/**
 * Set expirations on one or more hash fields.
 *
 * @command HPEXPIRE | HPEXPIREAT
 * @complexity O(N) where N is the number of specified fields
 * @speed fast
 * @since 7.4.0
 */
export const set = (client: RedisClient, key: string, ttl: Duration | Date, ...fields: [string, ...string[]]) => {
	// HPEXPIRE key milliseconds [NX | XX | GT | LT] FIELDS numfields field [field ...]

	const isDate = ttl instanceof Date
	const cmd = isDate ? 'HPEXPIREAT' : 'HPEXPIRE'
	const args: InputValue[] = [key]

	if (isDate) {
		args.push(ttl.getTime())
	} else {
		args.push(toSafeMilliSeconds(ttl).toString())
	}

	return command<boolean[], number[]>(client, cmd, [...args, 'FIELDS', fields.length, ...fields], r =>
		r.map(returnBoolean)
	)
}

/**
 * Get expiration dates for hash fields.
 *
 * @command HPEXPIRETIME
 * @complexity O(N) where N is the number of specified fields
 * @speed fast
 * @since 7.4.0
 */
export const get = (client: RedisClient, key: string, ...fields: [string, ...string[]]) => {
	return command<(Date | undefined)[], number[]>(
		client,
		'HPEXPIRETIME',
		[key, 'FIELDS', fields.length, ...fields],
		r =>
			r.map(v => {
				if (v < 0) {
					return undefined
				}

				return new Date(v)
			})
	)
}

/**
 * Get remaining TTL durations for hash fields.
 *
 * @command HPTTL
 * @complexity O(N) where N is the number of specified fields
 * @speed fast
 * @since 7.4.0
 */
export const duration = (client: RedisClient, key: string, ...fields: [string, ...string[]]) => {
	return command<(Duration | undefined)[], number[]>(client, 'HPTTL', [key, 'FIELDS', fields.length, ...fields], r =>
		r.map(v => {
			if (v < 0) {
				return undefined
			}

			return milliSeconds(v)
		})
	)
}

/**
 * Remove expirations from hash fields.
 *
 * @command HPERSIST
 * @complexity O(N) where N is the number of specified fields
 * @speed fast
 * @since 7.4.0
 */
const persist = (client: RedisClient, key: string, ...fields: [string, ...string[]]) => {
	return command<boolean[], number[]>(client, 'HPERSIST', [key, 'FIELDS', fields.length, ...fields], r =>
		r.map(returnBoolean)
	)
}

export { persist as delete }
