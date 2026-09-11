import { formatDouble } from './number'

// Replies are kept as plain data so the engine can be tested without a socket
// and so the RESP encoder is the only place that knows about the wire format.
export type Reply =
	| { type: 'status'; value: string }
	| { type: 'error'; value: string }
	| { type: 'int'; value: number | bigint }
	| { type: 'bulk'; value: string | null }
	| { type: 'array'; value: Reply[] | null }
	// Commands whose whole response is delivered as pushes (SUBSCRIBE).
	| { type: 'none' }
	// RESP3-only shapes; toResp2 folds them back for older clients and Lua.
	| { type: 'double'; value: number }
	| { type: 'map'; value: [Reply, Reply][] }
	| { type: 'set'; value: Reply[] }
	// An array of two-element arrays in RESP3 that RESP2 flattens (ZRANGE WITHSCORES).
	| { type: 'pairs'; value: [Reply, Reply][] }
	| { type: 'push'; value: Reply[] }
	| { type: 'verbatim'; value: string }

export const status = (value: string): Reply => ({ type: 'status', value })
export const error = (value: string): Reply => ({ type: 'error', value })
export const int = (value: number | bigint): Reply => ({ type: 'int', value })
export const bulk = (value: string | null | undefined): Reply => ({ type: 'bulk', value: value ?? null })
export const array = (value: Reply[] | null): Reply => ({ type: 'array', value })
export const bulks = (values: string[]): Reply => array(values.map(v => bulk(v)))
export const ints = (values: number[]): Reply => array(values.map(v => int(v)))
export const bool = (value: boolean): Reply => int(value ? 1 : 0)

export const OK = status('OK')
export const NIL = bulk(null)
export const NIL_ARRAY = array(null)
export const NONE: Reply = { type: 'none' }
export const double = (value: number): Reply => ({ type: 'double', value })
export const map = (value: [Reply, Reply][]): Reply => ({ type: 'map', value })
export const set = (value: Reply[]): Reply => ({ type: 'set', value })
export const pairs = (value: [Reply, Reply][]): Reply => ({ type: 'pairs', value })
export const push = (value: Reply[]): Reply => ({ type: 'push', value })
export const verbatim = (value: string): Reply => ({ type: 'verbatim', value })

export const toResp2 = (reply: Reply): Reply => {
	switch (reply.type) {
		case 'double':
			return bulk(formatDouble(reply.value))
		case 'map':
		case 'pairs':
			return array(reply.value.flatMap(([k, v]) => [toResp2(k), toResp2(v)]))
		case 'set':
		case 'push':
			return array(reply.value.map(toResp2))
		case 'verbatim':
			return bulk(reply.value)
		case 'array':
			return reply.value === null ? reply : array(reply.value.map(toResp2))
		default:
			return reply
	}
}
