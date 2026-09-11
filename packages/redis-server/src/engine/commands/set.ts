import { RedisError, syntaxError } from '../errors'
import { globMatch } from '../glob'
import { parseInteger } from '../number'
import { array, bool, bulk, bulks, int, NIL, Reply, set as setReply } from '../reply'
import type { SetEntry } from '../store'
import type { CommandDef, Context } from '../types'
import { expectArg, lookup, lookupOrCreate, parseScanOptions, randomIndex, scanSlice, shuffle } from './util'

const getSet = (ctx: Context, key: string) => lookup(ctx, key, 'set')
const getOrCreateSet = (ctx: Context, key: string) =>
	lookupOrCreate(ctx, key, 'set', (): SetEntry => ({ type: 'set', value: new Set() }))

const members = (ctx: Context, key: string): Set<string> => getSet(ctx, key)?.value ?? new Set()

const combine = (ctx: Context, keys: string[], op: 'diff' | 'inter' | 'union'): Set<string> => {
	const sets = keys.map(key => members(ctx, key))
	const first = sets[0] ?? new Set<string>()

	if (op === 'union') {
		const result = new Set<string>()
		for (const set of sets) {
			for (const m of set) result.add(m)
		}
		return result
	}

	const result = new Set<string>()

	for (const m of first) {
		const keep = op === 'inter' ? sets.every(s => s.has(m)) : !sets.slice(1).some(s => s.has(m))

		if (keep) {
			result.add(m)
		}
	}

	return result
}

const store = (ctx: Context, destination: string, result: Set<string>): Reply => {
	// The destination is overwritten even when the result is empty.
	ctx.db.delete(destination)

	if (result.size > 0) {
		ctx.db.set(destination, { type: 'set', value: result })
	}

	return int(result.size)
}

const randomMembers = (set: Set<string>, count: number) => {
	const list = [...set]

	if (count >= 0) {
		return shuffle(list).slice(0, count)
	}

	return Array.from({ length: -count }, () => list[randomIndex(list.length)]!)
}

export const commands: CommandDef[] = [
	{
		name: 'SADD',
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const set = getOrCreateSet(ctx, args[0]!)
			let added = 0

			for (const member of args.slice(1)) {
				if (!set.value.has(member)) {
					set.value.add(member)
					added++
				}
			}

			ctx.db.touch(args[0]!)

			return int(added)
		},
	},
	{
		name: 'SREM',
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const set = getSet(ctx, args[0]!)

			if (!set) {
				return int(0)
			}

			let removed = 0

			for (const member of args.slice(1)) {
				if (set.value.delete(member)) {
					removed++
				}
			}

			ctx.db.cleanup(args[0]!, set)

			return int(removed)
		},
	},
	{ name: 'SMEMBERS', arity: 2, handler: (ctx, args) => setReply([...members(ctx, args[0]!)].map(m => bulk(m))) },
	{ name: 'SISMEMBER', arity: 3, handler: (ctx, args) => bool(members(ctx, args[0]!).has(args[1]!)) },
	{
		name: 'SMISMEMBER',
		arity: -3,
		handler: (ctx, args) => {
			const set = members(ctx, args[0]!)
			return array(args.slice(1).map(m => bool(set.has(m))))
		},
	},
	{ name: 'SCARD', arity: 2, handler: (ctx, args) => int(members(ctx, args[0]!).size) },
	{
		name: 'SPOP',
		arity: -2,
		write: true,
		handler: (ctx, args) => {
			if (args.length > 2) {
				throw syntaxError()
			}

			const set = getSet(ctx, args[0]!)
			const count = args[1] === undefined ? undefined : parseInteger(args[1])

			if (count !== undefined && count < 0) {
				throw new RedisError('ERR value is out of range, must be positive')
			}

			if (!set) {
				return count === undefined ? NIL : array([])
			}

			const picked = randomMembers(set.value, count ?? 1)

			for (const m of picked) {
				set.value.delete(m)
			}

			ctx.db.cleanup(args[0]!, set)

			return count === undefined ? bulk(picked[0] ?? null) : bulks(picked)
		},
	},
	{
		name: 'SRANDMEMBER',
		arity: -2,
		handler: (ctx, args) => {
			if (args.length > 2) {
				throw syntaxError()
			}

			const set = getSet(ctx, args[0]!)
			const count = args[1] === undefined ? undefined : parseInteger(args[1])

			if (!set) {
				return count === undefined ? NIL : array([])
			}

			const picked = randomMembers(set.value, count ?? 1)

			return count === undefined ? bulk(picked[0] ?? null) : bulks(picked)
		},
	},
	{
		name: 'SMOVE',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const source = getSet(ctx, args[0]!)
			const destination = getSet(ctx, args[1]!)
			const member = args[2]!

			if (!source || !source.value.has(member)) {
				return int(0)
			}

			if (args[0] === args[1]) {
				return int(1)
			}

			source.value.delete(member)
			ctx.db.cleanup(args[0]!, source)
			;(destination ?? getOrCreateSet(ctx, args[1]!)).value.add(member)
			ctx.db.touch(args[1]!)

			return int(1)
		},
	},
	{ name: 'SDIFF', arity: -2, handler: (ctx, args) => setReply([...combine(ctx, args, 'diff')].map(m => bulk(m))) },
	{ name: 'SINTER', arity: -2, handler: (ctx, args) => setReply([...combine(ctx, args, 'inter')].map(m => bulk(m))) },
	{ name: 'SUNION', arity: -2, handler: (ctx, args) => setReply([...combine(ctx, args, 'union')].map(m => bulk(m))) },
	{
		name: 'SDIFFSTORE',
		arity: -3,
		write: true,
		handler: (ctx, args) => store(ctx, args[0]!, combine(ctx, args.slice(1), 'diff')),
	},
	{
		name: 'SINTERSTORE',
		arity: -3,
		write: true,
		handler: (ctx, args) => store(ctx, args[0]!, combine(ctx, args.slice(1), 'inter')),
	},
	{
		name: 'SUNIONSTORE',
		arity: -3,
		write: true,
		handler: (ctx, args) => store(ctx, args[0]!, combine(ctx, args.slice(1), 'union')),
	},
	{
		name: 'SINTERCARD',
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

			const size = combine(ctx, keys, 'inter').size

			return int(limit === 0 ? size : Math.min(size, limit))
		},
	},
	{
		name: 'SSCAN',
		arity: -3,
		handler: (ctx, args) => {
			const { match, count } = parseScanOptions(args.slice(2))
			const list = [...members(ctx, args[0]!)]
			// Small sets are intset/listpack encoded in redis and come back whole.
			const { next, items } = list.length <= 128 ? { next: '0', items: list } : scanSlice(list, args[1]!, count)

			return array([bulk(next), bulks(match === undefined ? items : items.filter(m => globMatch(match, m)))])
		},
	},
]
