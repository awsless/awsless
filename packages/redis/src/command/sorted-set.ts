import { Numeric } from '@awsless/big-float'
import chunk from 'chunk'
import { Command, InputValue, RedisClient } from '../type'
import { del as deleteKey } from './key'
import {
	buildScanArgs,
	command,
	iterable,
	removeNull,
	returnEcho,
	returnFloat,
	returnInt,
	returnScanResult,
	ScanOptions,
} from './util'

type SortedSetInputValue = [InputValue, Numeric]
type SortedSetOutput = [string, number]

const returnOptionalFloat = (value: string | null) => {
	if (value === null) {
		return undefined
	}

	return parseFloat(value)
}

const returnEntry = ([value, score]: (string | number | undefined)[]): SortedSetOutput => [
	//
	value as string,
	parseFloat(score!.toString()),
]

const returnSortedSet = (r: (string | number)[]) => chunk(r, 2).map(entry => returnEntry(entry))
const returnOptionalEntry = (r: (string | number)[]) => (r.length === 0 ? undefined : returnEntry(r))

/**
 * Add one or more scored values to a sorted set.
 *
 * @command ZADD
 * @complexity O(log(N)) for each item added, where N is the number of elements in the sorted set
 * @speed fast
 * @since 1.2.0
 */
export const add = (client: RedisClient, key: string, ...values: [SortedSetInputValue, ...SortedSetInputValue[]]) => {
	// ZADD key [NX | XX] [GT | LT] [CH] [INCR] score member [score member ...]

	const entries = values.map(([value, score]) => [score.toString(), value]).flat()
	return command<number, string>(client, 'ZADD', [key, ...entries], returnInt)
}

/**
 * Increment the score for a value in a sorted set.
 *
 * @command ZINCRBY
 * @complexity O(log(N)) where N is the number of elements in the sorted set
 * @speed fast
 * @since 1.2.0
 */
export const incr = (client: RedisClient, key: string, value: InputValue, score: Numeric) => {
	return command<number, string>(client, 'ZINCRBY', [key, score.toString(), value], returnFloat)
}

/**
 * Get the score for a value in a sorted set.
 *
 * @command ZSCORE
 * @complexity O(1)
 * @speed fast
 * @since 1.2.0
 */
export const score = (client: RedisClient, key: string, value: InputValue) => {
	return command<number | undefined, string | null>(client, 'ZSCORE', [key, value], returnOptionalFloat)
}

/**
 * Get the rank of a value in a sorted set.
 *
 * @command ZRANK
 * @complexity O(log(N)) where N is the number of elements in the sorted set
 * @speed fast
 * @since 2.0.0
 */
export const indexOf = (client: RedisClient, key: string, value: InputValue) => {
	// ZRANK key member [WITHSCORE]
	return command<undefined | number, null | number>(client, 'ZRANK', [key, value], removeNull)
}

/**
 * Remove one or more values from a sorted set.
 *
 * @command ZREM
 * @complexity O(M*log(N)) with N being the number of elements in the sorted set and M the number of elements to be removed
 * @speed fast
 * @since 1.2.0
 */
const del = (client: RedisClient, key: string, ...values: [InputValue, ...InputValue[]]) => {
	return command<number, string>(client, 'ZREM', [key, ...values], returnInt)
}

export { del as delete }

/**
 * Check whether a sorted set contains a value.
 *
 * @command ZRANK
 * @complexity O(log(N)) where N is the number of elements in the sorted set
 * @speed fast
 * @since 2.0.0
 */
export const has = (client: RedisClient, key: string, value: InputValue) => {
	return command<boolean, number | null>(client, 'ZRANK', [key, value], r => r !== null)
}

// export const intersection = (client: RedisClient, ...keys: [string, string, ...string[]]) => {
// 	return command<Set<string>, string[]>(client, 'ZINTER', [...keys], returnSet)
// }

// export const union = (client: RedisClient, ...keys: [string, string, ...string[]]) => {
// 	return command<Set<string>, string[]>(client, 'ZUNION', [...keys], returnSet)
// }

// export const difference = (client: RedisClient, ...keys: [string, string, ...string[]]) => {
// 	return command<Set<string>, string[]>(client, 'ZDIFF', [...keys], returnSet)
// }

/**
 * Get one or more random values from a sorted set.
 *
 * @command ZRANDMEMBER
 * @complexity O(N) where N is the number of members returned
 * @speed slow
 * @since 6.2.0
 */
export function random(client: RedisClient, key: string): Command<string | undefined, string | null>
export function random(client: RedisClient, key: string, count: number): Command<string[], string[]>
export function random(client: RedisClient, key: string, count?: number) {
	return command<any, any>(
		client,
		'ZRANDMEMBER',
		[key, count],
		typeof count !== 'undefined' ? returnEcho : removeNull
	)
}

/**
 * Remove and return the lowest or highest scored values.
 *
 * @command ZPOPMIN | ZPOPMAX
 * @complexity O(log(N)*M) with N being the number of elements in the sorted set and M being the number of elements popped
 * @speed fast
 * @since 5.0.0
 */
export function pop(
	client: RedisClient,
	key: string,
	score: 'min' | 'max'
): Command<SortedSetOutput | undefined, (number | string)[]>
export function pop(
	client: RedisClient,
	key: string,
	score: 'min' | 'max',
	count: number
): Command<SortedSetOutput[], (number | string)[]>
export function pop(client: RedisClient, key: string, score: 'min' | 'max', count?: number) {
	return command<any, any>(
		client,
		score === 'max' ? 'ZPOPMAX' : 'ZPOPMIN',
		[key, count],
		typeof count !== 'undefined' ? returnSortedSet : returnOptionalEntry
	)
}

/**
 * Get the number of values in a sorted set.
 *
 * @command ZCARD
 * @complexity O(1)
 * @speed fast
 * @since 1.2.0
 */
export const length = (client: RedisClient, key: string) => {
	return command<number, string>(client, 'ZCARD', [key], returnInt)
}

/**
 * Delete a sorted set key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
export const clear = deleteKey

/**
 * Get all values from a sorted set.
 *
 * @command ZRANGE
 * @complexity O(log(N)+M) where N is the number of elements in the sorted set and M the number of elements returned
 * @speed slow
 * @since 2.1.0
 */
export function all(client: RedisClient, key: string): Command<string[], string[]>
export function all(client: RedisClient, key: string, options: { withScores?: false }): Command<string[], string[]>
export function all(
	client: RedisClient,
	key: string,
	options: { withScores: true }
): Command<SortedSetOutput[], (number | string)[]>
export function all(client: RedisClient, key: string, options: { withScores?: boolean } = {}) {
	if (options.withScores) {
		return rangeByScore(client, key, 0, Infinity, { withScores: true })
	}

	return rangeByScore(client, key, 0, Infinity)
}

const formatInf = (num: Numeric) => {
	if (num === Infinity) {
		return '+inf'
	}

	if (num === -Infinity) {
		return '-inf'
	}

	return num.toString()
}

type RangeBaseOptions = {
	reverse?: boolean
}

type RankRangeOptions = RangeBaseOptions & {
	withScores?: boolean
}

type ScoreRangeOptions = RangeBaseOptions & {
	limit?: number
	offset?: number
	withScores?: boolean
}

type LexRangeOptions = RangeBaseOptions & {
	limit?: number
	offset?: number
}

const buildRangeArgs = (
	key: string,
	start: Numeric | string,
	end: Numeric | string,
	options: RangeBaseOptions & { by: 'rank' | 'score' | 'lex'; limit?: number; offset?: number; withScores?: boolean }
) => {
	const bounds =
		options.by === 'rank'
			? [start.toString(), end.toString()]
			: options.by === 'score'
			? options.reverse
				? [formatInf(end as Numeric), formatInf(start as Numeric)]
				: [formatInf(start as Numeric), formatInf(end as Numeric)]
			: options.reverse
				? [end.toString(), start.toString()]
				: [start.toString(), end.toString()]
	const args: (string | number)[] = [key, ...bounds]

	if (options.by === 'score') {
		args.push('BYSCORE')
	} else if (options.by === 'lex') {
		args.push('BYLEX')
	}

	if (options.reverse) {
		args.push('REV')
	}

	if (options.by !== 'rank') {
		args.push('LIMIT', options.offset ?? 0, options.limit ?? 10)
	}

	if (options.withScores) {
		args.push('WITHSCORES')
	}

	return args
}

/**
 * Read members by their rank positions in a sorted set.
 *
 * @command ZRANGE
 * @complexity O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned
 * @speed slow
 * @since 1.2.0
 */
export function rangeByRank(
	client: RedisClient,
	key: string,
	start: number,
	end: number,
	options?: RankRangeOptions & { withScores?: false }
): Command<string[], string[]>
export function rangeByRank(
	client: RedisClient,
	key: string,
	start: number,
	end: number,
	options: RankRangeOptions & { withScores: true }
): Command<SortedSetOutput[], (number | string)[]>
export function rangeByRank(
	client: RedisClient,
	key: string,
	start: number,
	end: number,
	options: RankRangeOptions = {}
) {
	return command<any, any>(
		client,
		'ZRANGE',
		buildRangeArgs(key, start, end, { ...options, by: 'rank' }),
		options.withScores ? returnSortedSet : returnEcho
	)
}

/**
 * Read members whose scores fall between two bounds.
 *
 * @command ZRANGE
 * @complexity O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned
 * @speed slow
 * @since 1.2.0
 */
export function rangeByScore(
	client: RedisClient,
	key: string,
	start: Numeric,
	end: Numeric,
	options?: ScoreRangeOptions & { withScores?: false }
): Command<string[], string[]>
export function rangeByScore(
	client: RedisClient,
	key: string,
	start: Numeric,
	end: Numeric,
	options: ScoreRangeOptions & { withScores: true }
): Command<SortedSetOutput[], (number | string)[]>
export function rangeByScore(
	client: RedisClient,
	key: string,
	start: Numeric,
	end: Numeric,
	options: ScoreRangeOptions = {}
) {
	return command<any, any>(
		client,
		'ZRANGE',
		buildRangeArgs(key, start, end, { ...options, by: 'score' }),
		options.withScores ? returnSortedSet : returnEcho
	)
}

/**
 * Read members whose values fall between two lexicographical bounds.
 *
 * @command ZRANGE
 * @complexity O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned
 * @speed slow
 * @since 1.2.0
 */
export const rangeByLex = (client: RedisClient, key: string, start: string, end: string, options: LexRangeOptions = {}) => {
	return command<string[], string[]>(
		client,
		'ZRANGE',
		buildRangeArgs(key, start, end, { ...options, by: 'lex' }),
		returnEcho
	)
}

const formatScanResult = (result: [string, (string | number)[]]) => {
	const { cursor, items } = returnScanResult(result)

	return {
		cursor,
		items: returnSortedSet(items),
	}
}

/**
 * Iterate through sorted set values and scores.
 *
 * @command ZSCAN
 * @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
 * @speed slow
 * @since 2.8.0
 */
export const scan = (client: RedisClient, key: string, options: ScanOptions = {}) => {
	// ZSCAN key cursor [MATCH pattern] [COUNT count]

	return {
		...command<{ cursor: string | undefined; items: SortedSetOutput[] }, [string, (string | number)[]]>(
			client,
			'ZSCAN',
			[key, ...buildScanArgs(options)],
			formatScanResult
		),
		...iterable(options.cursor, async cursor => {
			const result = await client.send('ZSCAN', [key, ...buildScanArgs({ ...options, cursor })])
			return formatScanResult(result)
		}),
	}
}
