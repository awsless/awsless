import { RedisError, syntaxError, unsupported } from '../errors'
import { globMatch } from '../glob'
import { parseInteger } from '../number'
import { array, bool, bulk, bulks, int, NIL, OK, Reply } from '../reply'
import { Entry, newHash } from '../store'
import type { CommandDef, Context } from '../types'
import { SortedSet } from '../zset'
import { expectArg, parseScanOptions, randomIndex, scanSlice } from './util'

const del = (ctx: Context, args: string[]) => {
	let count = 0

	for (const key of args) {
		if (ctx.db.get(key, ctx.now) && ctx.db.delete(key)) {
			count++
		}
	}

	return int(count)
}

// Aggregates are copied deeply so COPY never aliases the source entry.
export const cloneEntry = (entry: Entry): Entry => {
	switch (entry.type) {
		case 'string':
			return { type: 'string', value: entry.value }
		case 'list':
			return { type: 'list', value: [...entry.value] }
		case 'set':
			return { type: 'set', value: new Set(entry.value) }
		case 'hash': {
			const hash = newHash()
			for (const [k, v] of entry.value) {
				hash.value.set(k, v)
			}
			for (const [k, v] of entry.expires) {
				hash.expires.set(k, v)
			}
			return hash
		}
		case 'zset': {
			const zset = new SortedSet()
			for (const e of entry.value.entries()) {
				zset.add(e.member, e.score)
			}
			return { type: 'zset', value: zset }
		}
	}
}

type ExpireOptions = { nx: boolean; xx: boolean; gt: boolean; lt: boolean }

const parseExpireOptions = (args: string[]): ExpireOptions => {
	const options = { nx: false, xx: false, gt: false, lt: false }

	for (const arg of args) {
		const flag = arg.toUpperCase()

		if (flag === 'NX') options.nx = true
		else if (flag === 'XX') options.xx = true
		else if (flag === 'GT') options.gt = true
		else if (flag === 'LT') options.lt = true
		else throw new RedisError(`ERR Unsupported option ${arg}`)
	}

	if (options.nx && (options.xx || options.gt || options.lt)) {
		throw new RedisError('ERR NX and XX, GT or LT options at the same time are not compatible')
	}

	if (options.gt && options.lt) {
		throw new RedisError('ERR GT and LT options at the same time are not compatible')
	}

	return options
}

// Shared by EXPIRE, PEXPIRE, EXPIREAT and PEXPIREAT; `at` is absolute ms.
export const applyExpire = (ctx: Context, key: string, at: number, options: ExpireOptions): Reply => {
	if (!ctx.db.get(key, ctx.now)) {
		return int(0)
	}

	const current = ctx.db.expireAt(key)

	if (options.nx && current !== undefined) return int(0)
	if (options.xx && current === undefined) return int(0)
	if (options.gt && (current === undefined || at <= current)) return int(0)
	if (options.lt && current !== undefined && at >= current) return int(0)

	if (at <= ctx.now) {
		ctx.db.delete(key)
	} else {
		ctx.db.setExpire(key, at)
	}

	return int(1)
}

const expireTime = (value: string, unit: 'seconds' | 'ms', relative: boolean, now: number) => {
	const n = parseInteger(value)
	const ms = unit === 'seconds' ? n * 1000 : n

	if (!Number.isSafeInteger(ms) || (relative && !Number.isSafeInteger(now + ms))) {
		throw new RedisError("ERR invalid expire time in 'expire' command")
	}

	return relative ? now + ms : ms
}

const ttlReply = (ctx: Context, key: string, unit: 'seconds' | 'ms', absolute: boolean): Reply => {
	if (!ctx.db.get(key, ctx.now)) {
		return int(-2)
	}

	const at = ctx.db.expireAt(key)

	if (at === undefined) {
		return int(-1)
	}

	const value = absolute ? at : at - ctx.now

	return int(unit === 'seconds' ? Math.floor(value / 1000) : value)
}

const rename = (ctx: Context, from: string, to: string, onlyIfMissing: boolean): Reply => {
	const entry = ctx.db.get(from, ctx.now)

	if (!entry) {
		throw new RedisError('ERR no such key')
	}

	if (onlyIfMissing && ctx.db.get(to, ctx.now)) {
		return int(0)
	}

	if (from === to) {
		return onlyIfMissing ? int(0) : OK
	}

	const expiry = ctx.db.expireAt(from)
	ctx.db.delete(from)
	ctx.db.set(to, entry)

	if (expiry !== undefined) {
		ctx.db.setExpire(to, expiry)
	}

	return onlyIfMissing ? int(1) : OK
}

export const commands: CommandDef[] = [
	{ name: 'DEL', arity: -2, write: true, handler: del },
	{ name: 'UNLINK', arity: -2, write: true, handler: del },
	{
		name: 'EXISTS',
		arity: -2,
		handler: (ctx, args) => int(args.filter(key => ctx.db.get(key, ctx.now)).length),
	},
	{
		name: 'TYPE',
		arity: 2,
		handler: (ctx, args) => ({ type: 'status', value: ctx.db.get(args[0]!, ctx.now)?.type ?? 'none' }),
	},
	{
		name: 'TOUCH',
		arity: -2,
		handler: (ctx, args) => int(args.filter(key => ctx.db.get(key, ctx.now)).length),
	},
	{
		name: 'KEYS',
		arity: 2,
		handler: (ctx, args) => {
			const pattern = args[0]!
			return bulks(ctx.db.keys().filter(key => ctx.db.get(key, ctx.now) && globMatch(pattern, key)))
		},
	},
	{
		name: 'SCAN',
		arity: -2,
		handler: (ctx, args) => {
			const { match, count, type } = parseScanOptions(args.slice(1), true)
			const keys = ctx.db.keys().filter(key => {
				const entry = ctx.db.get(key, ctx.now)
				return entry && (type === undefined || entry.type === type)
			})
			const { next, items } = scanSlice(keys, args[0]!, count)

			return array([bulk(next), bulks(match === undefined ? items : items.filter(k => globMatch(match, k)))])
		},
	},
	{
		name: 'RANDOMKEY',
		arity: 1,
		handler: ctx => {
			const keys = ctx.db.keys().filter(key => ctx.db.get(key, ctx.now))
			return keys.length === 0 ? NIL : bulk(keys[randomIndex(keys.length)]!)
		},
	},
	{ name: 'RENAME', arity: 3, write: true, handler: (ctx, args) => rename(ctx, args[0]!, args[1]!, false) },
	{ name: 'RENAMENX', arity: 3, write: true, handler: (ctx, args) => rename(ctx, args[0]!, args[1]!, true) },
	{
		name: 'EXPIRE',
		arity: -3,
		write: true,
		handler: (ctx, args) =>
			applyExpire(
				ctx,
				args[0]!,
				expireTime(args[1]!, 'seconds', true, ctx.now),
				parseExpireOptions(args.slice(2))
			),
	},
	{
		name: 'PEXPIRE',
		arity: -3,
		write: true,
		handler: (ctx, args) =>
			applyExpire(ctx, args[0]!, expireTime(args[1]!, 'ms', true, ctx.now), parseExpireOptions(args.slice(2))),
	},
	{
		name: 'EXPIREAT',
		arity: -3,
		write: true,
		handler: (ctx, args) =>
			applyExpire(
				ctx,
				args[0]!,
				expireTime(args[1]!, 'seconds', false, ctx.now),
				parseExpireOptions(args.slice(2))
			),
	},
	{
		name: 'PEXPIREAT',
		arity: -3,
		write: true,
		handler: (ctx, args) =>
			applyExpire(ctx, args[0]!, expireTime(args[1]!, 'ms', false, ctx.now), parseExpireOptions(args.slice(2))),
	},
	{ name: 'TTL', arity: 2, handler: (ctx, args) => ttlReply(ctx, args[0]!, 'seconds', false) },
	{ name: 'PTTL', arity: 2, handler: (ctx, args) => ttlReply(ctx, args[0]!, 'ms', false) },
	{ name: 'EXPIRETIME', arity: 2, handler: (ctx, args) => ttlReply(ctx, args[0]!, 'seconds', true) },
	{ name: 'PEXPIRETIME', arity: 2, handler: (ctx, args) => ttlReply(ctx, args[0]!, 'ms', true) },
	{
		name: 'PERSIST',
		arity: 2,
		write: true,
		handler: (ctx, args) => bool(ctx.db.get(args[0]!, ctx.now) !== undefined && ctx.db.persist(args[0]!)),
	},
	{
		name: 'COPY',
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const source = args[0]!
			const destination = args[1]!
			let replace = false
			let target = ctx.db

			for (let i = 2; i < args.length; i++) {
				const option = args[i]!.toUpperCase()

				if (option === 'REPLACE') {
					replace = true
				} else if (option === 'DB') {
					const index = parseInteger(expectArg(args, ++i))
					const db = ctx.engine.databases[index]

					if (!db) {
						throw new RedisError('ERR DB index is out of range')
					}

					target = db
				} else {
					throw syntaxError()
				}
			}

			const entry = ctx.db.get(source, ctx.now)

			if (!entry) {
				return int(0)
			}

			if (target === ctx.db && source === destination) {
				throw new RedisError('ERR source and destination objects are the same')
			}

			if (target.get(destination, ctx.now)) {
				if (!replace) {
					return int(0)
				}

				target.delete(destination)
			}

			const expiry = ctx.db.expireAt(source)
			target.set(destination, cloneEntry(entry))

			if (expiry !== undefined) {
				target.setExpire(destination, expiry)
			}

			return int(1)
		},
	},
	{
		name: 'MOVE',
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			const key = args[0]!
			const target = ctx.engine.databases[parseInteger(args[1]!)]

			if (!target) {
				throw new RedisError('ERR DB index is out of range')
			}

			if (target === ctx.db) {
				throw new RedisError('ERR source and destination objects are the same')
			}

			const entry = ctx.db.get(key, ctx.now)

			if (!entry || target.get(key, ctx.now)) {
				return int(0)
			}

			const expiry = ctx.db.expireAt(key)
			ctx.db.delete(key)
			target.set(key, entry)

			if (expiry !== undefined) {
				target.setExpire(key, expiry)
			}

			return int(1)
		},
	},
	{
		name: 'OBJECT',
		arity: -2,
		handler: (ctx, args) => {
			const sub = args[0]!.toUpperCase()

			if (sub === 'ENCODING') {
				const entry = ctx.db.get(expectArg(args, 1), ctx.now)

				if (!entry) {
					return NIL
				}

				const encodings = {
					string: 'raw',
					list: 'listpack',
					set: 'hashtable',
					zset: 'skiplist',
					hash: 'hashtable',
				}
				return bulk(encodings[entry.type])
			}

			if (sub === 'HELP' || sub === 'REFCOUNT' || sub === 'IDLETIME' || sub === 'FREQ') {
				throw unsupported(`OBJECT ${sub}`)
			}

			throw new RedisError(`ERR unknown subcommand '${args[0]}'. Try OBJECT HELP.`)
		},
	},
	{
		name: 'DUMP',
		arity: 2,
		handler: () => {
			throw unsupported('DUMP')
		},
	},
	{
		name: 'RESTORE',
		arity: -4,
		write: true,
		handler: () => {
			throw unsupported('RESTORE')
		},
	},
	{
		name: 'MIGRATE',
		arity: -6,
		write: true,
		handler: () => {
			throw unsupported('MIGRATE')
		},
	},
	{
		name: 'SORT',
		arity: -2,
		write: true,
		handler: () => {
			throw unsupported('SORT')
		},
	},
	{
		name: 'SORT_RO',
		arity: -2,
		handler: () => {
			throw unsupported('SORT_RO')
		},
	},
	{ name: 'WAIT', arity: 3, handler: () => int(0) },
]
