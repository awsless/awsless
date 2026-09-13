import { createHash } from 'node:crypto'
import { lauxlib, lua, lualib, to_luastring, type LuaState } from 'fengari'
import type { RedisEngine } from './engine'
import { RedisError } from './errors'
import { formatG } from './number'
import { bulk, error, int, NIL, Reply, status, toResp2 } from './reply'
import type { Connection } from './types'

// Lua strings are byte arrays and our values are latin1 strings, so the two
// convert one char per byte without touching the content.
const toBytes = (value: string): Uint8Array => Buffer.from(value, 'latin1')
const fromBytes = (value: Uint8Array | null): string =>
	value === null ? '' : Buffer.from(value.buffer, value.byteOffset, value.length).toString('latin1')

const luaString = (value: string) => to_luastring(value)

const REDIS_VERSION = '7.2.4'
const REDIS_VERSION_NUM = 0x070204

// Redis' own error handler: turns string errors into {err, source, line}
// tables so both kinds of failure produce the same reply format.
const ERROR_HANDLER = `
local dbg = ...
return function(err)
	local i = dbg.getinfo(2, 'nSl')
	if i and i.what == 'C' then
		i = dbg.getinfo(3, 'nSl')
	end
	if type(err) ~= 'table' then
		err = { err = 'ERR ' .. tostring(err) }
	end
	if i and err['source'] == nil then
		err['source'] = i.source
		err['line'] = i.currentline
	end
	return err
end
`

// Scripts may not create or read undeclared globals, as in redis.
const PROTECT_GLOBALS = `
local mt = {}
mt.__newindex = function(t, n, v)
	error("Script attempted to create global variable '" .. tostring(n) .. "'", 2)
end
mt.__index = function(t, n)
	error("Script attempted to access nonexistent global variable '" .. tostring(n) .. "'", 2)
end
setmetatable(_G, mt)
`

const NULL = { cjson: 'null' }

export class LuaRuntime {
	private L: LuaState
	private scripts = new Map<string, { body: string; ref: number }>()
	private errorHandlerRef: number
	// The connection the running script issues redis.call on.
	private current: Connection | null = null

	constructor(private engine: RedisEngine) {
		const L = lauxlib.luaL_newstate()
		this.L = L

		for (const [name, open] of [
			['_G', lualib.luaopen_base],
			['string', lualib.luaopen_string],
			['table', lualib.luaopen_table],
			['math', lualib.luaopen_math],
		] as const) {
			lauxlib.luaL_requiref(L, luaString(name), open, 1)
			lua.lua_pop(L, 1)
		}

		for (const name of ['dofile', 'loadfile', 'load', 'require', 'collectgarbage', 'print']) {
			lua.lua_pushnil(L)
			lua.lua_setglobal(L, luaString(name))
		}

		lua.lua_atnativeerror(L, L => {
			const err = lua.lua_touserdata(L, 1)
			lua.lua_pushstring(L, luaString(err instanceof Error ? err.message : String(err)))
			return 1
		})

		this.registerRedisLibrary()
		this.registerCjsonLibrary()

		lauxlib.luaL_requiref(L, luaString('debug'), lualib.luaopen_debug, 0)
		this.compile(ERROR_HANDLER, 'redis_error_handler')
		lua.lua_pushvalue(L, -2)
		lua.lua_call(L, 1, 1)
		this.errorHandlerRef = lauxlib.luaL_ref(L, lua.LUA_REGISTRYINDEX)
		lua.lua_pop(L, 1)

		this.compile(PROTECT_GLOBALS, 'protect_globals')
		lua.lua_call(L, 0, 0)
	}

	static sha1(body: string) {
		return createHash('sha1').update(Buffer.from(body, 'latin1')).digest('hex')
	}

	exists(sha: string) {
		return this.scripts.has(sha)
	}

	load(body: string): string {
		const sha = LuaRuntime.sha1(body)

		if (!this.scripts.has(sha)) {
			this.compile(body, '@user_script')
			const ref = lauxlib.luaL_ref(this.L, lua.LUA_REGISTRYINDEX)
			this.scripts.set(sha, { body, ref })
		}

		return sha
	}

	flush() {
		for (const script of this.scripts.values()) {
			lauxlib.luaL_unref(this.L, lua.LUA_REGISTRYINDEX, script.ref)
		}

		this.scripts.clear()
	}

	run(sha: string, keys: string[], argv: string[], conn: Connection, readOnly: boolean): Reply {
		const script = this.scripts.get(sha)

		if (!script) {
			throw new RedisError('NOSCRIPT No matching script. Please use EVAL.')
		}

		if (this.current) {
			throw new RedisError('ERR This Redis command is not allowed from script')
		}

		const L = this.L
		const base = lua.lua_gettop(L)

		this.setGlobalArray('KEYS', keys)
		this.setGlobalArray('ARGV', argv)

		lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, this.errorHandlerRef)
		lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, script.ref)

		this.current = {
			...conn,
			multi: null,
			watches: [],
			subscriptions: { channels: new Set(), patterns: new Set(), shards: new Set() },
			push: () => {},
			script: { readOnly },
		}

		try {
			const code = lua.lua_pcall(L, 0, 1, base + 1)

			if (code !== lua.LUA_OK) {
				throw new RedisError(this.errorMessage(-1, sha))
			}

			return this.toReply(-1)
		} finally {
			this.current = null
			lua.lua_settop(L, base)
		}
	}

	private compile(body: string, name: string) {
		const bytes = toBytes(body)
		const code = lauxlib.luaL_loadbuffer(this.L, bytes, bytes.length, luaString(name))

		if (code !== lua.LUA_OK) {
			const message = fromBytes(lua.lua_tolstring(this.L, -1))
			lua.lua_pop(this.L, 1)
			throw new RedisError(`ERR Error compiling script (new function): ${message}`)
		}
	}

	private setGlobalArray(name: string, values: string[]) {
		const L = this.L
		lua.lua_pushglobaltable(L)
		lua.lua_pushstring(L, luaString(name))
		lua.lua_newtable(L)

		values.forEach((value, i) => {
			lua.lua_pushstring(L, toBytes(value))
			lua.lua_rawseti(L, -2, i + 1)
		})

		lua.lua_rawset(L, -3)
		lua.lua_pop(L, 1)
	}

	private errorMessage(index: number, sha: string) {
		const L = this.L
		const abs = lua.lua_absindex(L, index)

		if (lua.lua_type(L, abs) !== lua.LUA_TTABLE) {
			const text = lua.lua_tolstring(L, abs)
			return `ERR Error running script ${sha}: ${text === null ? 'execution failure' : fromBytes(text)}`
		}

		const field = (name: string) => {
			lua.lua_getfield(L, abs, luaString(name))
			const value = lua.lua_tolstring(L, -1)
			lua.lua_pop(L, 1)
			return value === null ? null : fromBytes(value)
		}

		const message = (field('err') ?? 'ERR execution failure').replace(/\r?\n/g, ' ')
		const source = field('source')
		const line = field('line')

		if (source && line) {
			return `${message} script: ${sha}, on ${source}:${line}.`
		}

		return message
	}

	// Redis reply -> Lua value, following the documented conversion table.
	// Scripts always see RESP2 shapes, as redis does without setresp(3).
	private pushReply(reply: Reply) {
		const L = this.L

		reply = toResp2(reply)

		switch (reply.type) {
			case 'status':
				lua.lua_newtable(L)
				lua.lua_pushstring(L, toBytes(reply.value))
				lua.lua_setfield(L, -2, luaString('ok'))
				break
			case 'error':
				lua.lua_newtable(L)
				lua.lua_pushstring(L, toBytes(reply.value))
				lua.lua_setfield(L, -2, luaString('err'))
				break
			case 'int': {
				const n = Number(reply.value)
				// fengari integers are 32 bit, wider values become floats.
				if (Number.isInteger(n) && n >= -2147483648 && n <= 2147483647) {
					lua.lua_pushinteger(L, n)
				} else {
					lua.lua_pushnumber(L, n)
				}
				break
			}
			case 'bulk':
				if (reply.value === null) {
					lua.lua_pushboolean(L, false)
				} else {
					lua.lua_pushstring(L, toBytes(reply.value))
				}
				break
			case 'array':
				if (reply.value === null) {
					lua.lua_pushboolean(L, false)
				} else {
					lua.lua_newtable(L)
					reply.value.forEach((item, i) => {
						this.pushReply(item)
						lua.lua_rawseti(L, -2, i + 1)
					})
				}
				break
			default:
				lua.lua_pushboolean(L, false)
				break
		}
	}

	// Lua value -> Redis reply, following the documented conversion table.
	private toReply(index: number): Reply {
		const L = this.L
		const abs = lua.lua_absindex(L, index)
		const type = lua.lua_type(L, abs)

		if (type === lua.LUA_TSTRING) {
			return bulk(fromBytes(lua.lua_tolstring(L, abs)))
		}

		if (type === lua.LUA_TBOOLEAN) {
			return lua.lua_toboolean(L, abs) ? int(1) : NIL
		}

		if (type === lua.LUA_TNUMBER) {
			const n = Math.trunc(lua.lua_tonumber(L, abs))
			return int(Number.isSafeInteger(n) ? n : BigInt(n))
		}

		if (type !== lua.LUA_TTABLE) {
			return NIL
		}

		lua.lua_getfield(L, abs, luaString('err'))

		if (lua.lua_type(L, -1) === lua.LUA_TSTRING) {
			const message = fromBytes(lua.lua_tolstring(L, -1)).replace(/\r?\n/g, ' ')
			lua.lua_pop(L, 1)
			return error(message)
		}

		lua.lua_pop(L, 1)
		lua.lua_getfield(L, abs, luaString('ok'))

		if (lua.lua_type(L, -1) === lua.LUA_TSTRING) {
			const message = fromBytes(lua.lua_tolstring(L, -1)).replace(/\r?\n/g, ' ')
			lua.lua_pop(L, 1)
			return status(message)
		}

		lua.lua_pop(L, 1)

		const items: Reply[] = []

		for (let i = 1; ; i++) {
			lua.lua_rawgeti(L, abs, i)

			if (lua.lua_type(L, -1) === lua.LUA_TNIL) {
				lua.lua_pop(L, 1)
				break
			}

			items.push(this.toReply(-1))
			lua.lua_pop(L, 1)
		}

		return { type: 'array', value: items }
	}

	private raiseError(message: string): never {
		const L = this.L
		lua.lua_newtable(L)
		lua.lua_pushstring(L, toBytes(message))
		lua.lua_setfield(L, -2, luaString('err'))
		lauxlib.luaL_where(L, 1)
		const where = fromBytes(lua.lua_tolstring(L, -1))
		lua.lua_pop(L, 1)
		const line = /:(\d+):/.exec(where)?.[1]

		if (line) {
			lua.lua_pushstring(L, luaString('@user_script'))
			lua.lua_setfield(L, -2, luaString('source'))
			lua.lua_pushstring(L, luaString(line))
			lua.lua_setfield(L, -2, luaString('line'))
		}

		return lua.lua_error(L)
	}

	private call(raise: boolean): number {
		const L = this.L
		const n = lua.lua_gettop(L)
		const fail = (message: string) => {
			if (raise) {
				return this.raiseError(message)
			}

			this.pushReply(error(message))
			return 1
		}

		if (n === 0) {
			return fail('ERR Please specify at least one argument for this redis lib call')
		}

		const argv: string[] = []

		for (let i = 1; i <= n; i++) {
			const type = lua.lua_type(L, i)

			if (type === lua.LUA_TNUMBER) {
				argv.push(formatLuaNumber(L, i))
			} else if (type === lua.LUA_TSTRING) {
				argv.push(fromBytes(lua.lua_tolstring(L, i)))
			} else {
				return fail('ERR Lua redis lib command arguments must be strings or integers')
			}
		}

		let reply: Reply

		try {
			reply = this.engine.call(argv, this.current!)
		} catch (err) {
			if (err instanceof RedisError) {
				return fail(err.message)
			}

			throw err
		}

		this.pushReply(reply)
		return 1
	}

	private registerRedisLibrary() {
		const L = this.L
		lua.lua_newtable(L)

		const register = (name: string, fn: (L: LuaState) => number) => {
			lua.lua_pushjsfunction(L, fn)
			lua.lua_setfield(L, -2, luaString(name))
		}

		register('call', () => this.call(true))
		register('pcall', () => this.call(false))
		register('sha1hex', L => {
			if (lua.lua_gettop(L) !== 1) {
				return this.raiseError('ERR wrong number of arguments')
			}

			const text = lua.lua_tolstring(L, 1)
			lua.lua_pushstring(L, luaString(LuaRuntime.sha1(fromBytes(text))))
			return 1
		})
		register('error_reply', L => {
			const text = lua.lua_tolstring(L, 1)

			if (lua.lua_type(L, 1) !== lua.LUA_TSTRING || text === null) {
				return this.raiseError('ERR wrong number or type of arguments')
			}

			this.pushReply(error(fromBytes(text)))
			return 1
		})
		register('status_reply', L => {
			const text = lua.lua_tolstring(L, 1)

			if (lua.lua_type(L, 1) !== lua.LUA_TSTRING || text === null) {
				return this.raiseError('ERR wrong number or type of arguments')
			}

			this.pushReply(status(fromBytes(text)))
			return 1
		})
		register('log', L => {
			if (lua.lua_gettop(L) < 2) {
				return this.raiseError('ERR redis.log() requires two arguments or more.')
			}

			if (lua.lua_type(L, 1) !== lua.LUA_TNUMBER) {
				return this.raiseError('ERR First argument must be a number (log level).')
			}

			return 0
		})
		// A no-op since redis 5, still called by older scripts.
		register('replicate_commands', L => {
			lua.lua_pushboolean(L, 1)
			return 1
		})
		register('setresp', L => {
			if (lua.lua_tonumber(L, 1) === 2) {
				return 0
			}

			return this.raiseError('ERR the local redis server does not support RESP3 replies to scripts')
		})

		for (const [name, value] of [
			['LOG_DEBUG', 0],
			['LOG_VERBOSE', 1],
			['LOG_NOTICE', 2],
			['LOG_WARNING', 3],
			['REDIS_VERSION_NUM', REDIS_VERSION_NUM],
		] as const) {
			lua.lua_pushinteger(L, value)
			lua.lua_setfield(L, -2, luaString(name))
		}

		lua.lua_pushstring(L, luaString(REDIS_VERSION))
		lua.lua_setfield(L, -2, luaString('REDIS_VERSION'))

		lua.lua_setglobal(L, luaString('redis'))
	}

	private registerCjsonLibrary() {
		const L = this.L
		lua.lua_newtable(L)

		lua.lua_pushjsfunction(L, L => {
			if (lua.lua_gettop(L) !== 1) {
				return this.raiseError('ERR bad argument #1 to encode (expected one argument)')
			}

			const json = JSON.stringify(this.toJson(1, 0))
			lua.lua_pushstring(L, Buffer.from(json, 'utf8'))
			return 1
		})
		lua.lua_setfield(L, -2, luaString('encode'))

		lua.lua_pushjsfunction(L, L => {
			const text = lua.lua_tolstring(L, 1)

			if (lua.lua_type(L, 1) !== lua.LUA_TSTRING || text === null) {
				return this.raiseError('ERR bad argument #1 to decode (string expected)')
			}

			let value: unknown

			try {
				value = JSON.parse(Buffer.from(text.buffer, text.byteOffset, text.length).toString('utf8'))
			} catch (err) {
				return this.raiseError(`ERR cjson.decode: ${err instanceof Error ? err.message : String(err)}`)
			}

			this.pushJson(value)
			return 1
		})
		lua.lua_setfield(L, -2, luaString('decode'))

		lua.lua_pushlightuserdata(L, NULL)
		lua.lua_setfield(L, -2, luaString('null'))

		lua.lua_setglobal(L, luaString('cjson'))
	}

	private pushJson(value: unknown) {
		const L = this.L

		if (value === null || value === undefined) {
			lua.lua_pushlightuserdata(L, NULL)
		} else if (typeof value === 'boolean') {
			lua.lua_pushboolean(L, value)
		} else if (typeof value === 'number') {
			if (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) {
				lua.lua_pushinteger(L, value)
			} else {
				lua.lua_pushnumber(L, value)
			}
		} else if (typeof value === 'string') {
			lua.lua_pushstring(L, Buffer.from(value, 'utf8'))
		} else if (Array.isArray(value)) {
			lua.lua_newtable(L)
			value.forEach((item, i) => {
				this.pushJson(item)
				lua.lua_rawseti(L, -2, i + 1)
			})
		} else {
			lua.lua_newtable(L)
			for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
				lua.lua_pushstring(L, Buffer.from(key, 'utf8'))
				this.pushJson(item)
				lua.lua_rawset(L, -3)
			}
		}
	}

	private toJson(index: number, depth: number): unknown {
		const L = this.L
		const abs = lua.lua_absindex(L, index)
		const type = lua.lua_type(L, abs)

		if (depth > 1000) {
			return this.raiseError('ERR Cannot serialise, excessive nesting (1001)')
		}

		if (type === lua.LUA_TNIL || type === lua.LUA_TLIGHTUSERDATA) {
			return null
		}

		if (type === lua.LUA_TBOOLEAN) {
			return lua.lua_toboolean(L, abs)
		}

		if (type === lua.LUA_TNUMBER) {
			const n = lua.lua_tonumber(L, abs)

			if (!Number.isFinite(n)) {
				return this.raiseError('ERR Cannot serialise number: must not be NaN or Inf')
			}

			return lua.lua_isinteger(L, abs) ? n : Number(formatG(n, 14))
		}

		if (type === lua.LUA_TSTRING) {
			const bytes = lua.lua_tolstring(L, abs)!
			return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length).toString('utf8')
		}

		if (type !== lua.LUA_TTABLE) {
			return this.raiseError(
				`ERR Cannot serialise ${type === lua.LUA_TFUNCTION ? 'function' : 'userdata'}: type not supported`
			)
		}

		const object: Record<string, unknown> = {}
		const array: unknown[] = []
		let isArray = true
		let max = 0

		lua.lua_pushnil(L)

		while (lua.lua_next(L, abs) !== 0) {
			const value = this.toJson(-1, depth + 1)

			if (lua.lua_type(L, -2) === lua.LUA_TNUMBER) {
				const key = lua.lua_tonumber(L, -2)

				if (Number.isInteger(key) && key > 0) {
					array[key - 1] = value
					max = Math.max(max, key)
				} else {
					isArray = false
				}

				object[formatLuaNumber(L, -2)] = value
			} else {
				isArray = false
				const key = lua.lua_tolstring(L, -2)!
				object[Buffer.from(key.buffer, key.byteOffset, key.length).toString('utf8')] = value
			}

			lua.lua_pop(L, 1)
		}

		if (isArray && max > 0) {
			return Array.from({ length: max }, (_, i) => array[i] ?? null)
		}

		return object
	}
}

// Lua 5.1 prints numbers with %.14g; integers must not gain a ".0" suffix.
const formatLuaNumber = (L: LuaState, index: number) => {
	if (lua.lua_isinteger(L, index)) {
		return String(lua.lua_tointeger(L, index))
	}

	const n = lua.lua_tonumber(L, index)
	return Number.isInteger(n) ? String(n) : formatG(n, 14)
}
