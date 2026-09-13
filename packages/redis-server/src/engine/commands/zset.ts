import { RedisError, syntaxError } from '../errors'
import { globMatch } from '../glob'
import { formatDouble, parseFloatArg, parseInteger } from '../number'
import { array, bulk, bulks, double, int, NIL, pairs, Reply } from '../reply'
import type { CommandDef, Context } from '../types'
import { SortedSet, ZEntry } from '../zset'
import {
	expectArg,
	lookup,
	lookupOrCreate,
	normalizeRange,
	parseScanOptions,
	randomIndex,
	scanSlice,
	shuffle,
} from './util'

const getZSet = (ctx: Context, key: string) => lookup(ctx, key, 'zset')
const getOrCreateZSet = (ctx: Context, key: string) =>
	lookupOrCreate(ctx, key, 'zset', () => ({ type: 'zset' as const, value: new SortedSet() }))

const parseScore = (value: string) => {
	const score = parseFloatArg(value)

	if (Number.isNaN(score)) {
		throw new RedisError('ERR value is not a valid float')
	}

	return score
}

const entriesReply = (entries: ZEntry[], withScores: boolean): Reply => {
	if (!withScores) {
		return bulks(entries.map(e => e.member))
	}

	return pairs(entries.map(e => [bulk(e.member), double(e.score)]))
}

type ScoreBound = { value: number; exclusive: boolean }
type LexBound = { value: string; exclusive: boolean; open: 'min' | 'max' | null }

const parseScoreBound = (value: string): ScoreBound => {
	const error = () => new RedisError('ERR min or max is not a float')

	if (value.startsWith('(')) {
		return { value: parseFloatArg(value.slice(1), error), exclusive: true }
	}

	return { value: parseFloatArg(value, error), exclusive: false }
}

const parseLexBound = (value: string): LexBound => {
	if (value === '-') return { value: '', exclusive: false, open: 'min' }
	if (value === '+') return { value: '', exclusive: false, open: 'max' }
	if (value.startsWith('(')) return { value: value.slice(1), exclusive: true, open: null }
	if (value.startsWith('[')) return { value: value.slice(1), exclusive: false, open: null }

	throw new RedisError('ERR min or max not valid string range item')
}

const rangeByScore = (zset: SortedSet, min: ScoreBound, max: ScoreBound): ZEntry[] => {
	const from = zset.scoreLowerBound(min.value, min.exclusive)
	const to = zset.scoreUpperBound(max.value, max.exclusive)

	return from >= to ? [] : zset.entries().slice(from, to)
}

const rangeByLex = (zset: SortedSet, min: LexBound, max: LexBound): ZEntry[] => {
	const from = min.open === 'min' ? 0 : min.open === 'max' ? zset.size : zset.lexLowerBound(min.value, min.exclusive)
	const to = max.open === 'max' ? zset.size : max.open === 'min' ? 0 : zset.lexUpperBound(max.value, max.exclusive)

	return from >= to ? [] : zset.entries().slice(from, to)
}

const rangeByRank = (zset: SortedSet, start: number, stop: number): ZEntry[] => {
	const [from, to] = normalizeRange(start, stop, zset.size)

	return from > to ? [] : zset.entries().slice(from, to + 1)
}

type RangeOptions = { by: 'rank' | 'score' | 'lex'; rev: boolean; limit: [number, number] | null; withScores: boolean }

// The unified ZRANGE evaluator, also backing the legacy ZRANGEBY* commands.
const evaluateRange = (zset: SortedSet | undefined, start: string, stop: string, options: RangeOptions): ZEntry[] => {
	if (!zset) {
		return []
	}

	let entries: ZEntry[]

	if (options.by === 'rank') {
		// With REV the ranks count from the highest score down.
		const list = options.rev ? zset.entries().toReversed() : [...zset.entries()]
		const [from, to] = normalizeRange(parseInteger(start), parseInteger(stop), list.length)
		entries = from > to ? [] : list.slice(from, to + 1)
	} else if (options.by === 'score') {
		// With REV the bounds are given as max then min.
		const min = parseScoreBound(options.rev ? stop : start)
		const max = parseScoreBound(options.rev ? start : stop)
		entries = rangeByScore(zset, min, max)

		if (options.rev) {
			entries = entries.toReversed()
		}
	} else {
		const min = parseLexBound(options.rev ? stop : start)
		const max = parseLexBound(options.rev ? start : stop)
		entries = rangeByLex(zset, min, max)

		if (options.rev) {
			entries = entries.toReversed()
		}
	}

	if (options.limit) {
		const [offset, count] = options.limit

		if (offset < 0) {
			return []
		}

		entries = count < 0 ? entries.slice(offset) : entries.slice(offset, offset + count)
	}

	return entries
}

const parseRangeArgs = (
	args: string[],
	defaults: Partial<RangeOptions>,
	allowed: { by: boolean; rev: boolean; limit: boolean; withScores: boolean }
): RangeOptions => {
	const options: RangeOptions = { by: 'rank', rev: false, limit: null, withScores: false, ...defaults }

	for (let i = 0; i < args.length; i++) {
		const option = args[i]!.toUpperCase()

		if (option === 'BYSCORE' && allowed.by) options.by = 'score'
		else if (option === 'BYLEX' && allowed.by) options.by = 'lex'
		else if (option === 'REV' && allowed.rev) options.rev = true
		else if (option === 'WITHSCORES' && allowed.withScores) options.withScores = true
		else if (option === 'LIMIT' && allowed.limit) {
			options.limit = [parseInteger(expectArg(args, i + 1)), parseInteger(expectArg(args, i + 2))]
			i += 2
		} else throw syntaxError()
	}

	if (options.limit && options.by === 'rank') {
		throw new RedisError('ERR syntax error, LIMIT is only supported in combination with either BYSCORE or BYLEX')
	}

	if (options.withScores && options.by === 'lex') {
		throw new RedisError('ERR syntax error, WITHSCORES not supported in combination with BYLEX')
	}

	return options
}

const zadd = (ctx: Context, args: string[]): Reply => {
	const key = args[0]!
	let i = 1
	let nx = false
	let xx = false
	let gt = false
	let lt = false
	let ch = false
	let incr = false

	for (; i < args.length; i++) {
		const option = args[i]!.toUpperCase()

		if (option === 'NX') nx = true
		else if (option === 'XX') xx = true
		else if (option === 'GT') gt = true
		else if (option === 'LT') lt = true
		else if (option === 'CH') ch = true
		else if (option === 'INCR') incr = true
		else break
	}

	const rest = args.slice(i)

	if (rest.length === 0 || rest.length % 2 !== 0) {
		throw syntaxError()
	}

	if (nx && xx) {
		throw new RedisError('ERR XX and NX options at the same time are not compatible')
	}

	if ((gt && lt) || ((gt || lt) && nx)) {
		throw new RedisError('ERR GT, LT, and/or NX options at the same time are not compatible')
	}

	if (incr && rest.length !== 2) {
		throw new RedisError('ERR INCR option supports a single increment-element pair')
	}

	// Every score is validated before anything is written.
	const pairs: [number, string][] = []

	for (let j = 0; j < rest.length; j += 2) {
		pairs.push([parseScore(rest[j]!), rest[j + 1]!])
	}

	const existing = getZSet(ctx, key)

	if (!existing && xx) {
		return incr ? NIL : int(0)
	}

	const zset = existing ?? getOrCreateZSet(ctx, key)
	let added = 0
	let changed = 0
	let incrResult: number | null = null

	for (const [score, member] of pairs) {
		const current = zset.value.score(member)

		if (current === undefined && xx) continue
		if (current !== undefined && nx) continue

		let next = score

		if (incr && current !== undefined) {
			next = current + score

			if (Number.isNaN(next)) {
				throw new RedisError('ERR resulting score is not a number (NaN)')
			}
		}

		if (current !== undefined && ((gt && next <= current) || (lt && next >= current))) {
			continue
		}

		if (zset.value.add(member, next)) {
			added++
		} else if (current !== next) {
			changed++
		}

		incrResult = next
	}

	ctx.db.cleanup(key, zset)

	if (incr) {
		return incrResult === null ? NIL : double(incrResult)
	}

	return int(ch ? added + changed : added)
}

type Aggregate = 'sum' | 'min' | 'max'

const parseSetOperation = (args: string[], withStoreDestination: boolean, allowWithScores: boolean) => {
	let index = 0
	const destination = withStoreDestination ? args[index++]! : null
	const numkeys = parseInteger(expectArg(args, index++))

	if (numkeys <= 0) {
		throw new RedisError('ERR at least 1 input key is needed for this command')
	}

	const keys = args.slice(index, index + numkeys)

	if (keys.length !== numkeys) {
		throw syntaxError()
	}

	index += numkeys
	let weights = keys.map(() => 1)
	let aggregate: Aggregate = 'sum'
	let withScores = false

	while (index < args.length) {
		const option = args[index]!.toUpperCase()

		if (option === 'WEIGHTS') {
			weights = keys.map((_, i) =>
				parseFloatArg(expectArg(args, index + 1 + i), () => new RedisError('ERR weight value is not a float'))
			)
			index += 1 + keys.length
		} else if (option === 'AGGREGATE') {
			const value = expectArg(args, index + 1).toLowerCase()

			if (value !== 'sum' && value !== 'min' && value !== 'max') {
				throw syntaxError()
			}

			aggregate = value
			index += 2
		} else if (option === 'WITHSCORES' && allowWithScores) {
			withScores = true
			index++
		} else {
			throw syntaxError()
		}
	}

	return { destination, keys, weights, aggregate, withScores }
}

// Sets are read as zsets with score 1, matching redis' ZUNION/ZINTER inputs.
const readScored = (ctx: Context, key: string): Map<string, number> | undefined => {
	const entry = ctx.db.get(key, ctx.now)

	if (!entry) {
		return undefined
	}

	if (entry.type === 'zset') {
		return new Map(entry.value.entries().map(e => [e.member, e.score]))
	}

	if (entry.type === 'set') {
		return new Map([...entry.value].map(m => [m, 1]))
	}

	throw new RedisError('WRONGTYPE Operation against a key holding the wrong kind of value')
}

const aggregateScores = (a: number, b: number, mode: Aggregate) => {
	if (mode === 'min') return Math.min(a, b)
	if (mode === 'max') return Math.max(a, b)

	const sum = a + b
	// inf + -inf is NaN in JS; redis treats it as 0.
	return Number.isNaN(sum) ? 0 : sum
}

const combine = (
	ctx: Context,
	op: 'union' | 'inter' | 'diff',
	keys: string[],
	weights: number[],
	aggregate: Aggregate
): SortedSet => {
	const inputs = keys.map(key => readScored(ctx, key) ?? new Map<string, number>())
	const result = new SortedSet()
	const weighted = (score: number, weight: number) => {
		const value = score * weight
		return Number.isNaN(value) ? 0 : value
	}

	if (op === 'diff') {
		const first = inputs[0]!
		for (const [member, score] of first) {
			if (!inputs.slice(1).some(set => set.has(member))) {
				result.add(member, score)
			}
		}
		return result
	}

	if (op === 'union') {
		const scores = new Map<string, number>()

		inputs.forEach((set, i) => {
			for (const [member, score] of set) {
				const value = weighted(score, weights[i]!)
				const current = scores.get(member)
				scores.set(member, current === undefined ? value : aggregateScores(current, value, aggregate))
			}
		})

		for (const [member, score] of scores) {
			result.add(member, score)
		}

		return result
	}

	const first = inputs[0]!

	for (const [member, score] of first) {
		if (!inputs.every(set => set.has(member))) {
			continue
		}

		let total = weighted(score, weights[0]!)

		for (let i = 1; i < inputs.length; i++) {
			total = aggregateScores(total, weighted(inputs[i]!.get(member)!, weights[i]!), aggregate)
		}

		result.add(member, total)
	}

	return result
}

const storeZSet = (ctx: Context, destination: string, zset: SortedSet): Reply => {
	ctx.db.delete(destination)

	if (zset.size > 0) {
		ctx.db.set(destination, { type: 'zset', value: zset })
	}

	return int(zset.size)
}

const setOperation = (op: 'union' | 'inter' | 'diff', store: boolean): CommandDef => ({
	name: `Z${op.toUpperCase()}${store ? 'STORE' : ''}`,
	arity: store ? -4 : -3,
	write: store,
	handler: (ctx, args) => {
		const { destination, keys, weights, aggregate, withScores } = parseSetOperation(args, store, !store)

		if (op === 'diff' && (args.includes('WEIGHTS') || args.includes('AGGREGATE'))) {
			throw syntaxError()
		}

		const result = combine(ctx, op, keys, weights, aggregate)

		if (store) {
			return storeZSet(ctx, destination!, result)
		}

		return entriesReply([...result.entries()], withScores)
	},
})

const popExtreme = (ctx: Context, args: string[], side: 'min' | 'max'): Reply => {
	if (args.length > 2) {
		throw syntaxError()
	}

	const key = args[0]!
	const count = args[1] === undefined ? undefined : parseInteger(args[1])

	if (count !== undefined && count < 0) {
		throw new RedisError('ERR value is out of range, must be positive')
	}

	const zset = getZSet(ctx, key)

	if (!zset) {
		return array([])
	}

	const n = Math.min(count ?? 1, zset.value.size)
	const popped: ZEntry[] = []

	for (let i = 0; i < n; i++) {
		const entry = side === 'min' ? zset.value.at(0)! : zset.value.at(zset.value.size - 1)!
		zset.value.remove(entry.member)
		popped.push(entry)
	}

	ctx.db.cleanup(key, zset)

	// Without a count redis replies with a flat pair even on RESP3.
	if (count === undefined) {
		return array(popped.flatMap(e => [bulk(e.member), double(e.score)]))
	}

	return entriesReply(popped, true)
}

const removeRange = (ctx: Context, key: string, entries: ZEntry[]): Reply => {
	const zset = getZSet(ctx, key)

	if (!zset) {
		return int(0)
	}

	for (const entry of entries) {
		zset.value.remove(entry.member)
	}

	ctx.db.cleanup(key, zset)

	return int(entries.length)
}

const rank = (ctx: Context, args: string[], reverse: boolean): Reply => {
	const withScore = args[2]?.toUpperCase() === 'WITHSCORE'

	if (args.length > 3 || (args.length === 3 && !withScore)) {
		throw syntaxError()
	}

	const zset = getZSet(ctx, args[0]!)
	const position = zset?.value.rank(args[1]!)

	if (!zset || position === undefined) {
		return withScore ? array(null) : NIL
	}

	const value = reverse ? zset.value.size - 1 - position : position

	if (!withScore) {
		return int(value)
	}

	return array([int(value), double(zset.value.score(args[1]!)!)])
}

export const commands: CommandDef[] = [
	{ name: 'ZADD', arity: -4, write: true, handler: zadd },
	{
		name: 'ZREM',
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]!)

			if (!zset) {
				return int(0)
			}

			let removed = 0

			for (const member of args.slice(1)) {
				if (zset.value.remove(member)) {
					removed++
				}
			}

			ctx.db.cleanup(args[0]!, zset)

			return int(removed)
		},
	},
	{
		name: 'ZSCORE',
		arity: 3,
		handler: (ctx, args) => {
			const score = getZSet(ctx, args[0]!)?.value.score(args[1]!)
			return score === undefined ? NIL : double(score)
		},
	},
	{
		name: 'ZMSCORE',
		arity: -3,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]!)
			return array(
				args.slice(1).map(member => {
					const score = zset?.value.score(member)
					return score === undefined ? NIL : double(score)
				})
			)
		},
	},
	{ name: 'ZCARD', arity: 2, handler: (ctx, args) => int(getZSet(ctx, args[0]!)?.value.size ?? 0) },
	{
		name: 'ZCOUNT',
		arity: 4,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]!)
			return int(zset ? rangeByScore(zset.value, parseScoreBound(args[1]!), parseScoreBound(args[2]!)).length : 0)
		},
	},
	{
		name: 'ZLEXCOUNT',
		arity: 4,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]!)
			return int(zset ? rangeByLex(zset.value, parseLexBound(args[1]!), parseLexBound(args[2]!)).length : 0)
		},
	},
	{
		name: 'ZINCRBY',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const key = args[0]!
			const delta = parseScore(args[1]!)
			const zset = getOrCreateZSet(ctx, key)
			const next = (zset.value.score(args[2]!) ?? 0) + delta

			if (Number.isNaN(next)) {
				throw new RedisError('ERR resulting score is not a number (NaN)')
			}

			zset.value.add(args[2]!, next)
			ctx.db.touch(key)

			return double(next)
		},
	},
	{ name: 'ZRANK', arity: -3, handler: (ctx, args) => rank(ctx, args, false) },
	{ name: 'ZREVRANK', arity: -3, handler: (ctx, args) => rank(ctx, args, true) },
	{
		name: 'ZRANGE',
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(3), {}, { by: true, rev: true, limit: true, withScores: true })
			return entriesReply(
				evaluateRange(getZSet(ctx, args[0]!)?.value, args[1]!, args[2]!, options),
				options.withScores
			)
		},
	},
	{
		name: 'ZREVRANGE',
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(
				args.slice(3),
				{ rev: true },
				{ by: false, rev: false, limit: false, withScores: true }
			)
			return entriesReply(
				evaluateRange(getZSet(ctx, args[0]!)?.value, args[1]!, args[2]!, options),
				options.withScores
			)
		},
	},
	{
		name: 'ZRANGEBYSCORE',
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(
				args.slice(3),
				{ by: 'score' },
				{ by: false, rev: false, limit: true, withScores: true }
			)
			return entriesReply(
				evaluateRange(getZSet(ctx, args[0]!)?.value, args[1]!, args[2]!, options),
				options.withScores
			)
		},
	},
	{
		name: 'ZREVRANGEBYSCORE',
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(
				args.slice(3),
				{ by: 'score', rev: true },
				{ by: false, rev: false, limit: true, withScores: true }
			)
			return entriesReply(
				evaluateRange(getZSet(ctx, args[0]!)?.value, args[1]!, args[2]!, options),
				options.withScores
			)
		},
	},
	{
		name: 'ZRANGEBYLEX',
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(
				args.slice(3),
				{ by: 'lex' },
				{ by: false, rev: false, limit: true, withScores: false }
			)
			return entriesReply(evaluateRange(getZSet(ctx, args[0]!)?.value, args[1]!, args[2]!, options), false)
		},
	},
	{
		name: 'ZREVRANGEBYLEX',
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(
				args.slice(3),
				{ by: 'lex', rev: true },
				{ by: false, rev: false, limit: true, withScores: false }
			)
			return entriesReply(evaluateRange(getZSet(ctx, args[0]!)?.value, args[1]!, args[2]!, options), false)
		},
	},
	{
		name: 'ZRANGESTORE',
		arity: -5,
		write: true,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(4), {}, { by: true, rev: true, limit: true, withScores: false })
			const entries = evaluateRange(getZSet(ctx, args[1]!)?.value, args[2]!, args[3]!, options)
			const result = new SortedSet()

			for (const entry of entries) {
				result.add(entry.member, entry.score)
			}

			return storeZSet(ctx, args[0]!, result)
		},
	},
	{ name: 'ZPOPMIN', arity: -2, write: true, handler: (ctx, args) => popExtreme(ctx, args, 'min') },
	{ name: 'ZPOPMAX', arity: -2, write: true, handler: (ctx, args) => popExtreme(ctx, args, 'max') },
	{
		name: 'ZRANDMEMBER',
		arity: -2,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]!)

			if (args.length === 1) {
				if (!zset) {
					return NIL
				}

				return bulk(zset.value.at(randomIndex(zset.value.size))!.member)
			}

			const count = parseInteger(args[1]!)
			const withScores = args[2]?.toUpperCase() === 'WITHSCORES'

			if (args.length > 3 || (args.length === 3 && !withScores)) {
				throw syntaxError()
			}

			if (!zset) {
				return array([])
			}

			const entries = [...zset.value.entries()]
			const picked =
				count >= 0
					? shuffle(entries).slice(0, count)
					: Array.from({ length: -count }, () => entries[randomIndex(entries.length)]!)

			return entriesReply(picked, withScores)
		},
	},
	setOperation('union', false),
	setOperation('inter', false),
	setOperation('diff', false),
	setOperation('union', true),
	setOperation('inter', true),
	setOperation('diff', true),
	{
		name: 'ZINTERCARD',
		arity: -3,
		handler: (ctx, args) => {
			const numkeys = parseInteger(args[0]!)

			if (numkeys <= 0) {
				throw new RedisError('ERR numkeys should be greater than 0')
			}

			const keys = args.slice(1, 1 + numkeys)

			if (keys.length !== numkeys) {
				throw new RedisError("ERR Number of keys can't be greater than number of args")
			}

			let limit = 0

			if (args.length > 1 + numkeys) {
				if (args[1 + numkeys]!.toUpperCase() !== 'LIMIT' || args.length !== 3 + numkeys) {
					throw syntaxError()
				}

				limit = parseInteger(expectArg(args, 2 + numkeys))

				if (limit < 0) {
					throw new RedisError("ERR LIMIT can't be negative")
				}
			}

			const size = combine(
				ctx,
				'inter',
				keys,
				keys.map(() => 1),
				'sum'
			).size

			return int(limit === 0 ? size : Math.min(size, limit))
		},
	},
	{
		name: 'ZREMRANGEBYRANK',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]!)
			return removeRange(
				ctx,
				args[0]!,
				zset ? rangeByRank(zset.value, parseInteger(args[1]!), parseInteger(args[2]!)) : []
			)
		},
	},
	{
		name: 'ZREMRANGEBYSCORE',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]!)
			return removeRange(
				ctx,
				args[0]!,
				zset ? rangeByScore(zset.value, parseScoreBound(args[1]!), parseScoreBound(args[2]!)) : []
			)
		},
	},
	{
		name: 'ZREMRANGEBYLEX',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]!)
			return removeRange(
				ctx,
				args[0]!,
				zset ? rangeByLex(zset.value, parseLexBound(args[1]!), parseLexBound(args[2]!)) : []
			)
		},
	},
	{
		name: 'ZSCAN',
		arity: -3,
		handler: (ctx, args) => {
			const { match, count } = parseScanOptions(args.slice(2))
			const entries = [...(getZSet(ctx, args[0]!)?.value.entries() ?? [])]
			// Small sorted sets are listpack encoded in redis and come back whole.
			const { next, items } =
				entries.length <= 128 ? { next: '0', items: entries } : scanSlice(entries, args[1]!, count)
			const filtered = match === undefined ? items : items.filter(e => globMatch(match, e.member))

			// ZSCAN keeps scores as bulk strings in a flat list on every protocol.
			return array([bulk(next), bulks(filtered.flatMap(e => [e.member, formatDouble(e.score)]))])
		},
	},
	{
		name: 'ZMPOP',
		arity: -4,
		write: true,
		handler: () => {
			throw new RedisError('ERR the local redis server does not support ZMPOP')
		},
	},
	{
		name: 'BZPOPMIN',
		arity: -3,
		write: true,
		handler: () => {
			throw new RedisError('ERR the local redis server does not support blocking sorted set commands')
		},
	},
	{
		name: 'BZPOPMAX',
		arity: -3,
		write: true,
		handler: () => {
			throw new RedisError('ERR the local redis server does not support blocking sorted set commands')
		},
	},
]
