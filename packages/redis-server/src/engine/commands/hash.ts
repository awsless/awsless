import { RedisError, syntaxError } from '../errors'
import { globMatch } from '../glob'
import { formatLongDouble, INT64_MAX, INT64_MIN, parseFloatArg, parseInt64, parseInteger } from '../number'
import { array, bool, bulk, bulks, int, ints, map, NIL, OK, pairs, Reply } from '../reply'
import { HashEntry, newHash } from '../store'
import type { CommandDef, Context } from '../types'
import { expectArg, lookup, lookupOrCreate, parseScanOptions, randomIndex, scanSlice, shuffle } from './util'

const getHash = (ctx: Context, key: string) => lookup(ctx, key, 'hash')
const getOrCreateHash = (ctx: Context, key: string) => lookupOrCreate(ctx, key, 'hash', newHash)

const setField = (hash: HashEntry, field: string, value: string) => {
	const isNew = !hash.value.has(field)
	hash.value.set(field, value)
	// Overwriting a field drops its expiry, as in redis 7.4.
	hash.expires.delete(field)
	return isNew
}

const hincrBy = (ctx: Context, key: string, field: string, delta: bigint): Reply => {
	const hash = getOrCreateHash(ctx, key)
	const current = hash.value.get(field)
	const base = current === undefined ? 0n : parseInt64Field(current)
	const next = base + delta

	if (next > INT64_MAX || next < INT64_MIN) {
		throw new RedisError('ERR increment or decrement would overflow')
	}

	hash.value.set(field, next.toString())
	ctx.db.touch(key)

	return int(next)
}

const parseInt64Field = (value: string) => {
	try {
		return parseInt64(value)
	} catch {
		throw new RedisError('ERR hash value is not an integer')
	}
}

// HEXPIRE family: `key <time> [NX|XX|GT|LT] FIELDS <n> field...`
const parseFieldArgs = (args: string[], from: number): { fields: string[]; condition: string | null } => {
	let i = from
	let condition: string | null = null
	const option = args[i]?.toUpperCase()

	if (option === 'NX' || option === 'XX' || option === 'GT' || option === 'LT') {
		condition = option
		i++
	}

	if (args[i]?.toUpperCase() !== 'FIELDS') {
		throw new RedisError('ERR Mandatory argument FIELDS is missing or not at the right position')
	}

	const count = parseInteger(
		expectArg(args, i + 1),
		() => new RedisError('ERR Parameter `numFields` should be greater than 0')
	)
	const fields = args.slice(i + 2)

	if (count <= 0) {
		throw new RedisError('ERR Parameter `numFields` should be greater than 0')
	}

	if (fields.length !== count) {
		throw new RedisError('ERR The `numFields` parameter must match the number of arguments')
	}

	return { fields, condition }
}

const hexpire = (ctx: Context, args: string[], unit: 'seconds' | 'ms', relative: boolean): Reply => {
	const key = args[0]!
	const n = parseInteger(args[1]!, () => new RedisError('ERR invalid expire time, must be >= 0'))

	if (n < 0) {
		throw new RedisError('ERR invalid expire time, must be >= 0')
	}

	const ms = unit === 'seconds' ? n * 1000 : n
	const at = relative ? ctx.now + ms : ms
	const { fields, condition } = parseFieldArgs(args, 2)
	const hash = getHash(ctx, key)

	if (!hash) {
		return ints(fields.map(() => -2))
	}

	const result = fields.map(field => {
		if (!hash.value.has(field)) {
			return -2
		}

		const current = hash.expires.get(field)

		if (condition === 'NX' && current !== undefined) return 0
		if (condition === 'XX' && current === undefined) return 0
		if (condition === 'GT' && (current === undefined || at <= current)) return 0
		if (condition === 'LT' && current !== undefined && at >= current) return 0

		if (at <= ctx.now) {
			hash.value.delete(field)
			hash.expires.delete(field)
			return 2
		}

		hash.expires.set(field, at)
		return 1
	})

	ctx.db.cleanup(key, hash)

	return ints(result)
}

const httl = (ctx: Context, args: string[], unit: 'seconds' | 'ms', absolute: boolean): Reply => {
	const { fields } = parseFieldArgs(args, 1)
	const hash = getHash(ctx, args[0]!)

	if (!hash) {
		return ints(fields.map(() => -2))
	}

	return ints(
		fields.map(field => {
			if (!hash.value.has(field)) {
				return -2
			}

			const at = hash.expires.get(field)

			if (at === undefined) {
				return -1
			}

			const value = absolute ? at : at - ctx.now
			return unit === 'seconds' ? Math.floor(value / 1000) : value
		})
	)
}

const hrandfield = (ctx: Context, args: string[]): Reply => {
	const hash = getHash(ctx, args[0]!)

	if (args.length === 1) {
		if (!hash) {
			return NIL
		}

		const fields = [...hash.value.keys()]
		return bulk(fields[randomIndex(fields.length)]!)
	}

	const count = parseInteger(args[1]!)
	const withValues = args[2]?.toUpperCase() === 'WITHVALUES'

	if (args.length > 3 || (args.length === 3 && !withValues)) {
		throw syntaxError()
	}

	if (!hash) {
		return array([])
	}

	const fields = [...hash.value.keys()]
	let picked: string[]

	if (count >= 0) {
		picked = shuffle(fields).slice(0, count)
	} else {
		picked = Array.from({ length: -count }, () => fields[randomIndex(fields.length)]!)
	}

	if (!withValues) {
		return bulks(picked)
	}

	return pairs(picked.map(field => [bulk(field), bulk(hash.value.get(field)!)]))
}

export const commands: CommandDef[] = [
	{
		name: 'HSET',
		arity: -4,
		write: true,
		handler: (ctx, args) => {
			if ((args.length - 1) % 2 !== 0) {
				throw new RedisError("ERR wrong number of arguments for 'hset' command")
			}

			const hash = getOrCreateHash(ctx, args[0]!)
			let added = 0

			for (let i = 1; i < args.length; i += 2) {
				if (setField(hash, args[i]!, args[i + 1]!)) {
					added++
				}
			}

			ctx.db.touch(args[0]!)

			return int(added)
		},
	},
	{
		name: 'HMSET',
		arity: -4,
		write: true,
		handler: (ctx, args) => {
			if ((args.length - 1) % 2 !== 0) {
				throw new RedisError("ERR wrong number of arguments for 'hmset' command")
			}

			const hash = getOrCreateHash(ctx, args[0]!)

			for (let i = 1; i < args.length; i += 2) {
				setField(hash, args[i]!, args[i + 1]!)
			}

			ctx.db.touch(args[0]!)

			return OK
		},
	},
	{
		name: 'HSETNX',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const hash = getOrCreateHash(ctx, args[0]!)

			if (hash.value.has(args[1]!)) {
				return int(0)
			}

			setField(hash, args[1]!, args[2]!)
			ctx.db.touch(args[0]!)

			return int(1)
		},
	},
	{ name: 'HGET', arity: 3, handler: (ctx, args) => bulk(getHash(ctx, args[0]!)?.value.get(args[1]!) ?? null) },
	{
		name: 'HMGET',
		arity: -3,
		handler: (ctx, args) => {
			const hash = getHash(ctx, args[0]!)
			return array(args.slice(1).map(field => bulk(hash?.value.get(field) ?? null)))
		},
	},
	{
		name: 'HGETALL',
		arity: 2,
		handler: (ctx, args) => {
			const hash = getHash(ctx, args[0]!)
			return map(hash ? [...hash.value].map(([k, v]) => [bulk(k), bulk(v)]) : [])
		},
	},
	{
		name: 'HDEL',
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const hash = getHash(ctx, args[0]!)

			if (!hash) {
				return int(0)
			}

			let removed = 0

			for (const field of args.slice(1)) {
				if (hash.value.delete(field)) {
					hash.expires.delete(field)
					removed++
				}
			}

			ctx.db.cleanup(args[0]!, hash)

			return int(removed)
		},
	},
	{ name: 'HEXISTS', arity: 3, handler: (ctx, args) => bool(getHash(ctx, args[0]!)?.value.has(args[1]!) ?? false) },
	{ name: 'HLEN', arity: 2, handler: (ctx, args) => int(getHash(ctx, args[0]!)?.value.size ?? 0) },
	{
		name: 'HSTRLEN',
		arity: 3,
		handler: (ctx, args) => int(getHash(ctx, args[0]!)?.value.get(args[1]!)?.length ?? 0),
	},
	{ name: 'HKEYS', arity: 2, handler: (ctx, args) => bulks([...(getHash(ctx, args[0]!)?.value.keys() ?? [])]) },
	{ name: 'HVALS', arity: 2, handler: (ctx, args) => bulks([...(getHash(ctx, args[0]!)?.value.values() ?? [])]) },
	{
		name: 'HINCRBY',
		arity: 4,
		write: true,
		handler: (ctx, args) => hincrBy(ctx, args[0]!, args[1]!, parseInt64(args[2]!)),
	},
	{
		name: 'HINCRBYFLOAT',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const hash = getOrCreateHash(ctx, args[0]!)
			const current = hash.value.get(args[1]!)
			const base =
				current === undefined
					? 0
					: parseFloatArg(current, () => new RedisError('ERR hash value is not a float'))
			const next = base + parseFloatArg(args[2]!)

			if (!Number.isFinite(next)) {
				throw new RedisError('ERR increment would produce NaN or Infinity')
			}

			const text = formatLongDouble(next)
			hash.value.set(args[1]!, text)
			ctx.db.touch(args[0]!)

			return bulk(text)
		},
	},
	{ name: 'HRANDFIELD', arity: -2, handler: hrandfield },
	{
		name: 'HSCAN',
		arity: -3,
		handler: (ctx, args) => {
			const { match, count } = parseScanOptions(args.slice(2))
			const hash = getHash(ctx, args[0]!)
			const entries = hash ? [...hash.value] : []
			// Small hashes are listpack encoded in redis and come back whole.
			const { next, items } =
				entries.length <= 128 ? { next: '0', items: entries } : scanSlice(entries, args[1]!, count)
			const filtered = match === undefined ? items : items.filter(([k]) => globMatch(match, k))

			return array([bulk(next), array(filtered.flatMap(([k, v]) => [bulk(k), bulk(v)]))])
		},
	},
	{ name: 'HEXPIRE', arity: -6, write: true, handler: (ctx, args) => hexpire(ctx, args, 'seconds', true) },
	{ name: 'HPEXPIRE', arity: -6, write: true, handler: (ctx, args) => hexpire(ctx, args, 'ms', true) },
	{ name: 'HEXPIREAT', arity: -6, write: true, handler: (ctx, args) => hexpire(ctx, args, 'seconds', false) },
	{ name: 'HPEXPIREAT', arity: -6, write: true, handler: (ctx, args) => hexpire(ctx, args, 'ms', false) },
	{ name: 'HTTL', arity: -5, handler: (ctx, args) => httl(ctx, args, 'seconds', false) },
	{ name: 'HPTTL', arity: -5, handler: (ctx, args) => httl(ctx, args, 'ms', false) },
	{ name: 'HEXPIRETIME', arity: -5, handler: (ctx, args) => httl(ctx, args, 'seconds', true) },
	{ name: 'HPEXPIRETIME', arity: -5, handler: (ctx, args) => httl(ctx, args, 'ms', true) },
	{
		name: 'HPERSIST',
		arity: -5,
		write: true,
		handler: (ctx, args) => {
			const { fields } = parseFieldArgs(args, 1)
			const hash = getHash(ctx, args[0]!)

			if (!hash) {
				return ints(fields.map(() => -2))
			}

			const result = fields.map(field => {
				if (!hash.value.has(field)) {
					return -2
				}

				return hash.expires.delete(field) ? 1 : -1
			})

			ctx.db.touch(args[0]!)

			return ints(result)
		},
	},
]
