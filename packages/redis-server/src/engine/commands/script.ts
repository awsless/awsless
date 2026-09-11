import { RedisError, syntaxError, unknownSubcommand, unsupported } from '../errors'
import { parseInteger } from '../number'
import { bulk, ints, OK } from '../reply'
import type { CommandDef, Context } from '../types'

const parseEvalArgs = (args: string[]) => {
	const numkeys = parseInteger(args[1]!)

	if (numkeys < 0) {
		throw new RedisError("ERR Number of keys can't be negative")
	}

	if (numkeys > args.length - 2) {
		throw new RedisError("ERR Number of keys can't be greater than number of args")
	}

	return { keys: args.slice(2, 2 + numkeys), argv: args.slice(2 + numkeys) }
}

const evalCommand = (bySha: boolean, readOnly: boolean) => (ctx: Context, args: string[]) => {
	const { keys, argv } = parseEvalArgs(args)
	const lua = ctx.engine.lua
	const sha = bySha ? args[0]!.toLowerCase() : lua.load(args[0]!)

	return lua.run(sha, keys, argv, ctx.conn, readOnly)
}

const script = (ctx: Context, args: string[]) => {
	const sub = args[0]!.toUpperCase()
	const lua = ctx.engine.lua

	switch (sub) {
		case 'LOAD':
			if (args.length !== 2) {
				throw new RedisError("ERR wrong number of arguments for 'script|load' command")
			}

			return bulk(lua.load(args[1]!))
		case 'EXISTS':
			if (args.length < 2) {
				throw new RedisError("ERR wrong number of arguments for 'script|exists' command")
			}

			return ints(args.slice(1).map(sha => (lua.exists(sha.toLowerCase()) ? 1 : 0)))
		case 'FLUSH': {
			const mode = args[1]?.toUpperCase()

			if (args.length > 2 || (mode !== undefined && mode !== 'ASYNC' && mode !== 'SYNC')) {
				throw syntaxError()
			}

			lua.flush()
			return OK
		}
		case 'KILL':
		case 'DEBUG':
		case 'HELP':
			throw unsupported(`SCRIPT ${sub}`)
		default:
			throw unknownSubcommand(args[0]!, 'script')
	}
}

export const commands: CommandDef[] = [
	{ name: 'EVAL', arity: -3, noscript: true, write: true, handler: evalCommand(false, false) },
	{ name: 'EVALSHA', arity: -3, noscript: true, write: true, handler: evalCommand(true, false) },
	{ name: 'EVAL_RO', arity: -3, noscript: true, handler: evalCommand(false, true) },
	{ name: 'EVALSHA_RO', arity: -3, noscript: true, handler: evalCommand(true, true) },
	{ name: 'SCRIPT', arity: -2, noscript: true, handler: script },
]
