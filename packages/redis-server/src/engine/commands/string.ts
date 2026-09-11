import { RedisError, syntaxError } from '../errors'
import { formatLongDouble, INT64_MAX, INT64_MIN, parseFloatArg, parseInt64, parseInteger } from '../number'
import { bulk, int, NIL, OK, Reply } from '../reply'
import type { CommandDef, Context } from '../types'
import { expectArg, lookup, normalizeRange } from './util'

const getString = (ctx: Context, key: string) => lookup(ctx, key, 'string')?.value

const setString = (ctx: Context, key: string, value: string, expireAt?: number) => {
	ctx.db.set(key, { type: 'string', value })

	if (expireAt !== undefined) {
		ctx.db.setExpire(key, expireAt)
	}
}

const parseExpiry = (value: string, unit: 'seconds' | 'ms', relative: boolean, now: number, command: string) => {
	const n = parseInteger(value, () => new RedisError(`ERR invalid expire time in '${command}' command`))
	const ms = unit === 'seconds' ? n * 1000 : n

	if (ms <= 0 || !Number.isSafeInteger(ms)) {
		throw new RedisError(`ERR invalid expire time in '${command}' command`)
	}

	return relative ? now + ms : ms
}

const set = (ctx: Context, args: string[]): Reply => {
	const key = args[0]!
	const value = args[1]!
	let expireAt: number | undefined
	let keepTtl = false
	let nx = false
	let xx = false
	let get = false

	for (let i = 2; i < args.length; i++) {
		const option = args[i]!.toUpperCase()

		if (option === 'NX' && !xx) nx = true
		else if (option === 'XX' && !nx) xx = true
		else if (option === 'GET') get = true
		else if (option === 'KEEPTTL' && expireAt === undefined) keepTtl = true
		else if (
			(option === 'EX' || option === 'PX' || option === 'EXAT' || option === 'PXAT') &&
			!keepTtl &&
			expireAt === undefined
		) {
			const unit = option.startsWith('EX') ? 'seconds' : 'ms'
			expireAt = parseExpiry(expectArg(args, ++i), unit, !option.endsWith('AT'), ctx.now, 'set')
		} else {
			throw syntaxError()
		}
	}

	const previous = get ? getString(ctx, key) : undefined
	const exists = ctx.db.get(key, ctx.now) !== undefined

	if ((nx && exists) || (xx && !exists)) {
		return get ? bulk(previous ?? null) : NIL
	}

	const currentExpiry = keepTtl ? ctx.db.expireAt(key) : undefined
	setString(ctx, key, value, expireAt ?? currentExpiry)

	return get ? bulk(previous ?? null) : OK
}

const incrBy = (ctx: Context, key: string, delta: bigint): Reply => {
	const current = getString(ctx, key)
	const base = current === undefined ? 0n : parseInt64(current)
	const next = base + delta

	if (next > INT64_MAX || next < INT64_MIN) {
		throw new RedisError('ERR increment or decrement would overflow')
	}

	setString(ctx, key, next.toString(), ctx.db.expireAt(key))

	return int(next)
}

const getRange = (value: string, start: number, end: number) => {
	if (value.length === 0) {
		return ''
	}

	const [from, to] = normalizeRange(start, end, value.length)

	if (from > to) {
		return ''
	}

	return value.slice(from, to + 1)
}

export const commands: CommandDef[] = [
	{ name: 'GET', arity: 2, handler: (ctx, args) => bulk(getString(ctx, args[0]!) ?? null) },
	{ name: 'SET', arity: -3, write: true, handler: set },
	{
		name: 'SETNX',
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			if (ctx.db.get(args[0]!, ctx.now)) {
				return int(0)
			}

			setString(ctx, args[0]!, args[1]!)

			return int(1)
		},
	},
	{
		name: 'SETEX',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			setString(ctx, args[0]!, args[2]!, parseExpiry(args[1]!, 'seconds', true, ctx.now, 'setex'))
			return OK
		},
	},
	{
		name: 'PSETEX',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			setString(ctx, args[0]!, args[2]!, parseExpiry(args[1]!, 'ms', true, ctx.now, 'psetex'))
			return OK
		},
	},
	{
		name: 'GETSET',
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			const previous = getString(ctx, args[0]!)
			setString(ctx, args[0]!, args[1]!)
			return bulk(previous ?? null)
		},
	},
	{
		name: 'GETDEL',
		arity: 2,
		write: true,
		handler: (ctx, args) => {
			const previous = getString(ctx, args[0]!)

			if (previous !== undefined) {
				ctx.db.delete(args[0]!)
			}

			return bulk(previous ?? null)
		},
	},
	{
		name: 'GETEX',
		arity: -2,
		write: true,
		handler: (ctx, args) => {
			const key = args[0]!
			const value = getString(ctx, key)
			let expireAt: number | undefined
			let persist = false

			for (let i = 1; i < args.length; i++) {
				const option = args[i]!.toUpperCase()

				if (option === 'PERSIST' && expireAt === undefined) {
					persist = true
				} else if (
					(option === 'EX' || option === 'PX' || option === 'EXAT' || option === 'PXAT') &&
					!persist &&
					expireAt === undefined
				) {
					const unit = option.startsWith('EX') ? 'seconds' : 'ms'
					expireAt = parseExpiry(expectArg(args, ++i), unit, !option.endsWith('AT'), ctx.now, 'getex')
				} else {
					throw syntaxError()
				}
			}

			if (value === undefined) {
				return NIL
			}

			if (persist) {
				ctx.db.persist(key)
			} else if (expireAt !== undefined) {
				ctx.db.setExpire(key, expireAt)
			}

			return bulk(value)
		},
	},
	{
		name: 'MGET',
		arity: -2,
		handler: (ctx, args) => ({
			type: 'array',
			value: args.map(key => {
				const entry = ctx.db.get(key, ctx.now)
				return bulk(entry?.type === 'string' ? entry.value : null)
			}),
		}),
	},
	{
		name: 'MSET',
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			if (args.length % 2 !== 0) {
				throw new RedisError("ERR wrong number of arguments for 'mset' command")
			}

			for (let i = 0; i < args.length; i += 2) {
				setString(ctx, args[i]!, args[i + 1]!)
			}

			return OK
		},
	},
	{
		name: 'MSETNX',
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			if (args.length % 2 !== 0) {
				throw new RedisError("ERR wrong number of arguments for 'msetnx' command")
			}

			for (let i = 0; i < args.length; i += 2) {
				if (ctx.db.get(args[i]!, ctx.now)) {
					return int(0)
				}
			}

			for (let i = 0; i < args.length; i += 2) {
				setString(ctx, args[i]!, args[i + 1]!)
			}

			return int(1)
		},
	},
	{ name: 'INCR', arity: 2, write: true, handler: (ctx, args) => incrBy(ctx, args[0]!, 1n) },
	{ name: 'DECR', arity: 2, write: true, handler: (ctx, args) => incrBy(ctx, args[0]!, -1n) },
	{ name: 'INCRBY', arity: 3, write: true, handler: (ctx, args) => incrBy(ctx, args[0]!, parseInt64(args[1]!)) },
	{ name: 'DECRBY', arity: 3, write: true, handler: (ctx, args) => incrBy(ctx, args[0]!, -parseInt64(args[1]!)) },
	{
		name: 'INCRBYFLOAT',
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			const key = args[0]!
			const current = getString(ctx, key)
			const base = current === undefined ? 0 : parseFloatArg(current)
			const next = base + parseFloatArg(args[1]!)

			if (!Number.isFinite(next)) {
				throw new RedisError('ERR increment would produce NaN or Infinity')
			}

			const text = formatLongDouble(next)
			setString(ctx, key, text, ctx.db.expireAt(key))

			return bulk(text)
		},
	},
	{
		name: 'APPEND',
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			const key = args[0]!
			const value = (getString(ctx, key) ?? '') + args[1]!
			setString(ctx, key, value, ctx.db.expireAt(key))
			return int(value.length)
		},
	},
	{ name: 'STRLEN', arity: 2, handler: (ctx, args) => int(getString(ctx, args[0]!)?.length ?? 0) },
	{
		name: 'GETRANGE',
		arity: 4,
		handler: (ctx, args) =>
			bulk(getRange(getString(ctx, args[0]!) ?? '', parseInteger(args[1]!), parseInteger(args[2]!))),
	},
	{
		name: 'SUBSTR',
		arity: 4,
		handler: (ctx, args) =>
			bulk(getRange(getString(ctx, args[0]!) ?? '', parseInteger(args[1]!), parseInteger(args[2]!))),
	},
	{
		name: 'SETRANGE',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const key = args[0]!
			const offset = parseInteger(args[1]!)
			const patch = args[2]!

			if (offset < 0) {
				throw new RedisError('ERR offset is out of range')
			}

			if (offset + patch.length > 512 * 1024 * 1024) {
				throw new RedisError('ERR string exceeds maximum allowed size (proto-max-bulk-len)')
			}

			const current = getString(ctx, key) ?? ''

			if (patch.length === 0) {
				return int(current.length)
			}

			const padded = current.length < offset ? current + '\0'.repeat(offset - current.length) : current
			const value = padded.slice(0, offset) + patch + padded.slice(offset + patch.length)
			setString(ctx, key, value, ctx.db.expireAt(key))

			return int(value.length)
		},
	},
	{
		name: 'LCS',
		arity: -3,
		handler: () => {
			throw new RedisError('ERR the local redis server does not support LCS')
		},
	},
	{
		name: 'SETBIT',
		arity: 4,
		write: true,
		handler: () => {
			throw new RedisError('ERR the local redis server does not support bitmap commands')
		},
	},
	{
		name: 'GETBIT',
		arity: 3,
		handler: () => {
			throw new RedisError('ERR the local redis server does not support bitmap commands')
		},
	},
]
