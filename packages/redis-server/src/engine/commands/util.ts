import { RedisError, syntaxError, wrongType } from '../errors'
import { parseInteger } from '../number'
import type { Entry, EntryType } from '../store'
import type { Context } from '../types'

type EntryOf<T extends EntryType> = Extract<Entry, { type: T }>

export const lookup = <T extends EntryType>(ctx: Context, key: string, type: T): EntryOf<T> | undefined => {
	const entry = ctx.db.get(key, ctx.now)

	if (!entry) {
		return undefined
	}

	if (entry.type !== type) {
		throw wrongType()
	}

	return entry as EntryOf<T>
}

export const lookupOrCreate = <T extends EntryType>(
	ctx: Context,
	key: string,
	type: T,
	create: () => EntryOf<T>
): EntryOf<T> => {
	const existing = lookup(ctx, key, type)

	if (existing) {
		return existing
	}

	const entry = create()
	ctx.db.set(key, entry)

	return entry
}

export const expectArg = (args: string[], index: number): string => {
	const value = args[index]

	if (value === undefined) {
		throw syntaxError()
	}

	return value
}

// Redis' negative-index convention shared by LRANGE, ZRANGE, GETRANGE etc.
export const normalizeRange = (start: number, end: number, length: number): [number, number] => {
	if (start < 0) {
		start = length + start
	}

	if (end < 0) {
		end = length + end
	}

	if (start < 0) {
		start = 0
	}

	if (end >= length) {
		end = length - 1
	}

	return [start, end]
}

// SCAN-family cursor over a snapshot: the cursor is simply the offset.
export const scanSlice = <T>(items: T[], cursor: string, count: number): { next: string; items: T[] } => {
	const offset = parseInteger(cursor, () => new RedisError('ERR invalid cursor'))
	const slice = items.slice(offset, offset + count)
	const end = offset + count

	return {
		next: end >= items.length ? '0' : String(end),
		items: slice,
	}
}

export const parseScanOptions = (
	args: string[],
	allowType = false
): { match: string | undefined; count: number; type: string | undefined } => {
	let match: string | undefined
	let count = 10
	let type: string | undefined

	for (let i = 0; i < args.length; i += 2) {
		const option = expectArg(args, i).toUpperCase()
		const value = expectArg(args, i + 1)

		if (option === 'MATCH') {
			match = value
		} else if (option === 'COUNT') {
			count = parseInteger(value)

			if (count < 1) {
				throw syntaxError()
			}
		} else if (option === 'TYPE' && allowType) {
			type = value.toLowerCase()
		} else {
			throw syntaxError()
		}
	}

	return { match, count, type }
}

export const randomIndex = (length: number) => Math.floor(Math.random() * length)

export const shuffle = <T>(items: T[]) => {
	for (let i = items.length - 1; i > 0; i--) {
		const j = randomIndex(i + 1)
		const tmp = items[i]!
		items[i] = items[j]!
		items[j] = tmp
	}

	return items
}
