// fengari ships without types; only the slice of the C-style API we use is declared.
declare module 'fengari' {
	export type LuaState = { readonly __brand: 'lua_State' }
	export type LuaFunction = (L: LuaState) => number

	export function to_luastring(value: string, cache?: boolean): Uint8Array
	export function to_jsstring(value: Uint8Array): string

	export const lua: {
		LUA_OK: number
		LUA_REGISTRYINDEX: number
		LUA_MULTRET: number
		LUA_TNIL: number
		LUA_TBOOLEAN: number
		LUA_TLIGHTUSERDATA: number
		LUA_TNUMBER: number
		LUA_TSTRING: number
		LUA_TTABLE: number
		LUA_TFUNCTION: number
		lua_absindex(L: LuaState, index: number): number
		lua_atnativeerror(L: LuaState, handler: LuaFunction): LuaFunction | null
		lua_call(L: LuaState, nargs: number, nresults: number): void
		lua_error(L: LuaState): never
		lua_getfield(L: LuaState, index: number, name: Uint8Array | string): number
		lua_gettop(L: LuaState): number
		lua_isinteger(L: LuaState, index: number): boolean
		lua_newtable(L: LuaState): void
		lua_next(L: LuaState, index: number): number
		lua_pcall(L: LuaState, nargs: number, nresults: number, errfunc: number): number
		lua_pop(L: LuaState, count: number): void
		lua_pushboolean(L: LuaState, value: boolean | number): void
		lua_pushglobaltable(L: LuaState): void
		lua_pushinteger(L: LuaState, value: number): void
		lua_pushjsfunction(L: LuaState, fn: LuaFunction): void
		lua_pushlightuserdata(L: LuaState, value: unknown): void
		lua_pushliteral(L: LuaState, value: string): void
		lua_pushnil(L: LuaState): void
		lua_pushnumber(L: LuaState, value: number): void
		lua_pushstring(L: LuaState, value: Uint8Array | string): void
		lua_pushvalue(L: LuaState, index: number): void
		lua_rawget(L: LuaState, index: number): number
		lua_rawgeti(L: LuaState, index: number, n: number): number
		lua_rawlen(L: LuaState, index: number): number
		lua_rawset(L: LuaState, index: number): void
		lua_rawseti(L: LuaState, index: number, n: number): void
		lua_setfield(L: LuaState, index: number, name: Uint8Array | string): void
		lua_setglobal(L: LuaState, name: Uint8Array | string): void
		lua_settop(L: LuaState, index: number): void
		lua_toboolean(L: LuaState, index: number): boolean
		lua_tointeger(L: LuaState, index: number): number
		lua_tolstring(L: LuaState, index: number): Uint8Array | null
		lua_tonumber(L: LuaState, index: number): number
		lua_touserdata(L: LuaState, index: number): unknown
		lua_type(L: LuaState, index: number): number
	}

	export const lauxlib: {
		LUA_NOREF: number
		luaL_newstate(): LuaState
		luaL_loadbuffer(L: LuaState, code: Uint8Array, size: number, name: Uint8Array): number
		luaL_ref(L: LuaState, table: number): number
		luaL_unref(L: LuaState, table: number, ref: number): void
		luaL_requiref(L: LuaState, name: Uint8Array, open: LuaFunction, global: number): void
		luaL_where(L: LuaState, level: number): void
	}

	export const lualib: {
		luaopen_base: LuaFunction
		luaopen_string: LuaFunction
		luaopen_table: LuaFunction
		luaopen_math: LuaFunction
		luaopen_debug: LuaFunction
	}
}
