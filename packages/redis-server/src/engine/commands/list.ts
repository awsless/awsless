import { RedisError, syntaxError, unsupported } from '../errors'
import { parseInteger } from '../number'
import { array, bulk, bulks, int, NIL, NIL_ARRAY, OK, Reply } from '../reply'
import type { ListEntry } from '../store'
import type { CommandDef, Context } from '../types'
import { expectArg, lookup, lookupOrCreate, normalizeRange } from './util'

const getList = (ctx: Context, key: string) => lookup(ctx, key, 'list')
const getOrCreateList = (ctx: Context, key: string) =>
	lookupOrCreate(ctx, key, 'list', (): ListEntry => ({ type: 'list', value: [] }))

const push = (ctx: Context, args: string[], side: 'left' | 'right', onlyExisting: boolean): Reply => {
	const key = args[0]!
	const list = onlyExisting ? getList(ctx, key) : getOrCreateList(ctx, key)

	if (!list) {
		return int(0)
	}

	for (const value of args.slice(1)) {
		if (side === 'left') {
			list.value.unshift(value)
		} else {
			list.value.push(value)
		}
	}

	ctx.db.touch(key)

	return int(list.value.length)
}

const pop = (ctx: Context, args: string[], side: 'left' | 'right'): Reply => {
	const key = args[0]!
	const list = getList(ctx, key)
	const count = args[1] === undefined ? undefined : parseInteger(args[1])

	if (count !== undefined && count < 0) {
		throw new RedisError('ERR value is out of range, must be positive')
	}

	if (!list) {
		return count === undefined ? NIL : NIL_ARRAY
	}

	const popped = popMany(list, side, count ?? 1)
	ctx.db.cleanup(key, list)

	return count === undefined ? bulk(popped[0]!) : bulks(popped)
}

const popMany = (list: ListEntry, side: 'left' | 'right', count: number) => {
	const n = Math.min(count, list.value.length)
	return side === 'left' ? list.value.splice(0, n) : list.value.splice(list.value.length - n, n).toReversed()
}

const parseSide = (value: string): 'left' | 'right' => {
	const side = value.toUpperCase()

	if (side === 'LEFT') return 'left'
	if (side === 'RIGHT') return 'right'

	throw syntaxError()
}

const move = (
	ctx: Context,
	source: string,
	destination: string,
	from: 'left' | 'right',
	to: 'left' | 'right'
): Reply => {
	const list = getList(ctx, source)

	if (!list) {
		return NIL
	}

	const value = from === 'left' ? list.value.shift()! : list.value.pop()!
	const target = source === destination ? list : getOrCreateList(ctx, destination)

	if (to === 'left') {
		target.value.unshift(value)
	} else {
		target.value.push(value)
	}

	ctx.db.cleanup(source, list)
	ctx.db.touch(destination)

	return bulk(value)
}

const blocking = (name: string): CommandDef => ({
	name,
	arity: -3,
	write: true,
	handler: () => {
		throw unsupported(`blocking list commands (${name})`)
	},
})

export const commands: CommandDef[] = [
	{ name: 'LPUSH', arity: -3, write: true, handler: (ctx, args) => push(ctx, args, 'left', false) },
	{ name: 'RPUSH', arity: -3, write: true, handler: (ctx, args) => push(ctx, args, 'right', false) },
	{ name: 'LPUSHX', arity: -3, write: true, handler: (ctx, args) => push(ctx, args, 'left', true) },
	{ name: 'RPUSHX', arity: -3, write: true, handler: (ctx, args) => push(ctx, args, 'right', true) },
	{ name: 'LPOP', arity: -2, write: true, handler: (ctx, args) => pop(ctx, args, 'left') },
	{ name: 'RPOP', arity: -2, write: true, handler: (ctx, args) => pop(ctx, args, 'right') },
	{ name: 'LLEN', arity: 2, handler: (ctx, args) => int(getList(ctx, args[0]!)?.value.length ?? 0) },
	{
		name: 'LRANGE',
		arity: 4,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]!)

			if (!list) {
				return array([])
			}

			const [start, end] = normalizeRange(parseInteger(args[1]!), parseInteger(args[2]!), list.value.length)

			return bulks(start > end ? [] : list.value.slice(start, end + 1))
		},
	},
	{
		name: 'LINDEX',
		arity: 3,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]!)
			let index = parseInteger(args[1]!)

			if (!list) {
				return NIL
			}

			if (index < 0) {
				index += list.value.length
			}

			return bulk(list.value[index] ?? null)
		},
	},
	{
		name: 'LSET',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]!)
			let index = parseInteger(args[1]!)

			if (!list) {
				throw new RedisError('ERR no such key')
			}

			if (index < 0) {
				index += list.value.length
			}

			if (index < 0 || index >= list.value.length) {
				throw new RedisError('ERR index out of range')
			}

			list.value[index] = args[2]!
			ctx.db.touch(args[0]!)

			return OK
		},
	},
	{
		name: 'LINSERT',
		arity: 5,
		write: true,
		handler: (ctx, args) => {
			const where = args[1]!.toUpperCase()

			if (where !== 'BEFORE' && where !== 'AFTER') {
				throw syntaxError()
			}

			const list = getList(ctx, args[0]!)

			if (!list) {
				return int(0)
			}

			const index = list.value.indexOf(args[2]!)

			if (index === -1) {
				return int(-1)
			}

			list.value.splice(where === 'BEFORE' ? index : index + 1, 0, args[3]!)
			ctx.db.touch(args[0]!)

			return int(list.value.length)
		},
	},
	{
		name: 'LREM',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]!)
			const count = parseInteger(args[1]!)
			const value = args[2]!

			if (!list) {
				return int(0)
			}

			let removed = 0
			const limit = count === 0 ? Infinity : Math.abs(count)

			if (count >= 0) {
				for (let i = 0; i < list.value.length && removed < limit;) {
					if (list.value[i] === value) {
						list.value.splice(i, 1)
						removed++
					} else {
						i++
					}
				}
			} else {
				for (let i = list.value.length - 1; i >= 0 && removed < limit; i--) {
					if (list.value[i] === value) {
						list.value.splice(i, 1)
						removed++
					}
				}
			}

			ctx.db.cleanup(args[0]!, list)

			return int(removed)
		},
	},
	{
		name: 'LTRIM',
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]!)

			if (!list) {
				return OK
			}

			const [start, end] = normalizeRange(parseInteger(args[1]!), parseInteger(args[2]!), list.value.length)
			list.value = start > end ? [] : list.value.slice(start, end + 1)
			ctx.db.cleanup(args[0]!, list)

			return OK
		},
	},
	{
		name: 'LPOS',
		arity: -3,
		handler: (ctx, args) => {
			const value = args[1]!
			let rank = 1
			let count: number | undefined
			let maxlen = 0

			for (let i = 2; i < args.length; i++) {
				const option = args[i]!.toUpperCase()
				const param = expectArg(args, ++i)

				if (option === 'RANK') {
					rank = parseInteger(param)

					if (rank === 0) {
						throw new RedisError(
							"ERR RANK can't be zero: use 1 to start from the first match, 2 from the second ... or use negative to start from the end of the list"
						)
					}
				} else if (option === 'COUNT') {
					count = parseInteger(param)

					if (count < 0) {
						throw new RedisError("ERR COUNT can't be negative")
					}
				} else if (option === 'MAXLEN') {
					maxlen = parseInteger(param)

					if (maxlen < 0) {
						throw new RedisError("ERR MAXLEN can't be negative")
					}
				} else {
					throw syntaxError()
				}
			}

			const list = getList(ctx, args[0]!)

			if (!list) {
				return count === undefined ? NIL : array([])
			}

			const items = list.value
			const matches: number[] = []
			const limit = count === undefined ? 1 : count === 0 ? Infinity : count
			let skip = Math.abs(rank) - 1
			let scanned = 0

			const consider = (i: number) => {
				if (items[i] === value) {
					if (skip > 0) {
						skip--
					} else {
						matches.push(i)
					}
				}
			}

			if (rank > 0) {
				for (let i = 0; i < items.length && matches.length < limit; i++, scanned++) {
					if (maxlen && scanned >= maxlen) break
					consider(i)
				}
			} else {
				for (let i = items.length - 1; i >= 0 && matches.length < limit; i--, scanned++) {
					if (maxlen && scanned >= maxlen) break
					consider(i)
				}
			}

			if (count === undefined) {
				return matches.length === 0 ? NIL : int(matches[0]!)
			}

			return array(matches.map(i => int(i)))
		},
	},
	{
		name: 'LMOVE',
		arity: 5,
		write: true,
		handler: (ctx, args) => move(ctx, args[0]!, args[1]!, parseSide(args[2]!), parseSide(args[3]!)),
	},
	{
		name: 'RPOPLPUSH',
		arity: 3,
		write: true,
		handler: (ctx, args) => move(ctx, args[0]!, args[1]!, 'right', 'left'),
	},
	{
		name: 'LMPOP',
		arity: -4,
		write: true,
		handler: (ctx, args) => {
			const numkeys = parseInteger(args[0]!)

			if (numkeys <= 0) {
				throw new RedisError('ERR numkeys should be greater than 0')
			}

			const keys = args.slice(1, 1 + numkeys)

			if (keys.length !== numkeys) {
				throw syntaxError()
			}

			const side = parseSide(expectArg(args, 1 + numkeys))
			let count = 1

			if (args.length > 2 + numkeys) {
				if (args[2 + numkeys]!.toUpperCase() !== 'COUNT' || args.length !== 4 + numkeys) {
					throw syntaxError()
				}

				count = parseInteger(args[3 + numkeys]!)

				if (count <= 0) {
					throw new RedisError('ERR count should be greater than 0')
				}
			}

			for (const key of keys) {
				const list = getList(ctx, key)

				if (list) {
					const popped = popMany(list, side, count)
					ctx.db.cleanup(key, list)
					return array([bulk(key), bulks(popped)])
				}
			}

			return NIL_ARRAY
		},
	},
	blocking('BLPOP'),
	blocking('BRPOP'),
	blocking('BLMOVE'),
	blocking('BRPOPLPUSH'),
	blocking('BLMPOP'),
]
