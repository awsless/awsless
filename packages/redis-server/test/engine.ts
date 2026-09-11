import { createHash } from 'node:crypto'
import { globMatch } from '../src/engine/glob'
import { formatDouble, formatLongDouble } from '../src/engine/number'
import { array, bulk, double, map, pairs, push, set, verbatim } from '../src/engine/reply'
import { encodeReply } from '../src/resp'
import { createEngine, err } from './_helpers'

describe('glob', () => {
	it('matches redis patterns', () => {
		expect(globMatch('*', 'anything')).toBe(true)
		expect(globMatch('h?llo', 'hello')).toBe(true)
		expect(globMatch('h?llo', 'hllo')).toBe(false)
		expect(globMatch('h*llo', 'heeeello')).toBe(true)
		expect(globMatch('h[ae]llo', 'hallo')).toBe(true)
		expect(globMatch('h[ae]llo', 'hillo')).toBe(false)
		expect(globMatch('h[^e]llo', 'hallo')).toBe(true)
		expect(globMatch('h[^e]llo', 'hello')).toBe(false)
		expect(globMatch('h[a-b]llo', 'hbllo')).toBe(true)
		expect(globMatch('h[b-a]llo', 'hbllo')).toBe(true)
		expect(globMatch('h\\*llo', 'h*llo')).toBe(true)
		expect(globMatch('h\\*llo', 'hello')).toBe(false)
		expect(globMatch('scan-key-*', 'scan-key-1')).toBe(true)
		expect(globMatch('scan-key-*', 'other')).toBe(false)
		expect(globMatch('', '')).toBe(true)
		expect(globMatch('a', '')).toBe(false)
		expect(globMatch('*', '')).toBe(true)
		expect(globMatch('[a', 'a')).toBe(true)
	})
})

describe('number formatting', () => {
	it('formats doubles like redis', () => {
		expect(formatDouble(1)).toBe('1')
		expect(formatDouble(1.5)).toBe('1.5')
		expect(formatDouble(7.33)).toBe('7.33')
		expect(formatDouble(Infinity)).toBe('inf')
		expect(formatDouble(-Infinity)).toBe('-inf')
	})

	it('trims incrbyfloat noise', () => {
		expect(formatLongDouble(10.5)).toBe('10.5')
		expect(formatLongDouble(3)).toBe('3')
		expect(formatLongDouble(0.1 + 0.2)).toBe('0.3')
		expect(formatLongDouble(1e21)).toBe('1e+21')
	})
})

describe('dispatch', () => {
	const { run } = createEngine()

	it('rejects unknown commands and subcommands', () => {
		expect(run('NOPE', 'a', 'b')).toEqual(err("ERR unknown command 'NOPE', with args beginning with: 'a' 'b' "))
		expect(run('HELLO', '4')).toEqual(err('NOPROTO unsupported protocol version'))
		expect(run('CLIENT', 'NOPE')).toEqual(err("ERR unknown subcommand 'NOPE'. Try CLIENT HELP."))
	})

	it('rejects wrong arity with the lowercase name', () => {
		expect(run('GET')).toEqual(err("ERR wrong number of arguments for 'get' command"))
		expect(run('set', 'a')).toEqual(err("ERR wrong number of arguments for 'set' command"))
	})

	it('rejects unsupported commands loudly', () => {
		expect(run('BLPOP', 'k', '0')).toEqual(
			err('ERR the local redis server does not support blocking list commands (BLPOP)')
		)
		expect(run('DUMP', 'k')).toEqual(err('ERR the local redis server does not support DUMP'))
		expect(run('CONFIG', 'SET', 'maxmemory', '1')).toEqual(
			err('ERR the local redis server does not support CONFIG SET')
		)
	})

	it('answers connection commands', () => {
		expect(run('PING')).toBe('PONG')
		expect(run('PING', 'hi')).toBe('hi')
		expect(run('ECHO', 'x')).toBe('x')
		expect(run('AUTH', 'secret')).toBe('OK')
		expect(run('CLIENT', 'SETNAME', 'me')).toBe('OK')
		expect(run('CLIENT', 'GETNAME')).toBe('me')
		expect(run('CLIENT', 'SETINFO', 'LIB-NAME', 'ioredis')).toBe('OK')
		expect(run('CLIENT', 'ID')).toBeTypeOf('number')
		expect(run('CLIENT', 'LIST')).toContain('name=me')
		expect(run('COMMAND')).toEqual([])
		expect(run('COMMAND', 'DOCS', 'get')).toEqual([])
		expect(run('CONFIG', 'GET', 'databases')).toEqual(['databases', '16'])
		expect(run('CONFIG', 'GET', 'maxmemory')).toEqual(['maxmemory', '0'])
		expect(run('CONFIG', 'GET', 'nonexistent')).toEqual([])
		expect(run('TIME')).toEqual([expect.any(String), expect.any(String)])
		expect(run('SAVE')).toBe('OK')
		expect(run('LASTSAVE')).toBeTypeOf('number')
	})

	it('reports info sections', () => {
		run('SET', 'a', '1')
		run('SET', 'b', '1', 'EX', '100')
		const info = run('INFO', 'keyspace') as string
		expect(info).toContain('# Keyspace')
		expect(info).toMatch(/^db0:keys=2,expires=1,avg_ttl=0$/m)
		expect(run('INFO', 'replication')).toContain('role:master')
		expect(run('INFO', 'server')).toContain('redis_version:7.2.4')
		expect(run('INFO')).toContain('# Clients')
		run('FLUSHALL')
	})
})

describe('resp3', () => {
	const { run, conn } = createEngine()

	it('negotiates the protocol with hello', () => {
		expect(conn.protocol).toBe(2)
		expect(run('HELLO')).toEqual(expect.arrayContaining(['proto', 2]))
		expect(run('HELLO', '3', 'SETNAME', 'three')).toEqual(expect.arrayContaining(['proto', 3, 'version', '7.2.4']))
		expect(conn.protocol).toBe(3)
		expect(conn.name).toBe('three')
		expect(run('HELLO', '3', 'AUTH', 'user', 'pass')).toEqual(expect.arrayContaining(['server', 'redis']))
		expect(run('HELLO', 'x')).toEqual(err('ERR Protocol version is not an integer or out of range'))
		expect(run('RESET')).toBe('RESET')
		expect(conn.protocol).toBe(2)
	})

	it('lifts the subscribed-mode restriction on resp3', () => {
		run('HELLO', '3')
		run('SUBSCRIBE', 'chan')
		expect(run('SET', 'k', 'v')).toBe('OK')
		expect(run('PING')).toBe('PONG')
		run('RESET')
	})

	it('encodes resp3 frames', () => {
		expect(encodeReply(pairs([[bulk('a'), double(1.5)]]), 3)).toBe('*1\r\n*2\r\n$1\r\na\r\n,1.5\r\n')
		expect(encodeReply(pairs([[bulk('a'), double(1.5)]]), 2)).toBe('*2\r\n$1\r\na\r\n$3\r\n1.5\r\n')
		expect(encodeReply(map([[bulk('k'), bulk('v')]]), 3)).toBe('%1\r\n$1\r\nk\r\n$1\r\nv\r\n')
		expect(encodeReply(map([[bulk('k'), bulk('v')]]), 2)).toBe('*2\r\n$1\r\nk\r\n$1\r\nv\r\n')
		expect(encodeReply(set([bulk('a')]), 3)).toBe('~1\r\n$1\r\na\r\n')
		expect(encodeReply(push([bulk('message')]), 3)).toBe('>1\r\n$7\r\nmessage\r\n')
		expect(encodeReply(push([bulk('message')]), 2)).toBe('*1\r\n$7\r\nmessage\r\n')
		expect(encodeReply(bulk(null), 3)).toBe('_\r\n')
		expect(encodeReply(array(null), 3)).toBe('_\r\n')
		expect(encodeReply(bulk(null), 2)).toBe('$-1\r\n')
		expect(encodeReply(double(Infinity), 3)).toBe(',inf\r\n')
		expect(encodeReply(verbatim('x'), 3)).toBe('=5\r\ntxt:x\r\n')
		expect(encodeReply(verbatim('x'), 2)).toBe('$1\r\nx\r\n')
	})
})

describe('strings', () => {
	const { run } = createEngine()

	it('sets and gets', () => {
		expect(run('SET', 'k', 'v')).toBe('OK')
		expect(run('GET', 'k')).toBe('v')
		expect(run('GET', 'missing')).toBeNull()
		expect(run('SET', 'k', 'v2', 'NX')).toBeNull()
		expect(run('SET', 'other', 'v', 'XX')).toBeNull()
		expect(run('SET', 'k', 'v3', 'GET')).toBe('v')
		expect(run('SET', 'k', 'v4', 'NX', 'GET')).toBe('v3')
		expect(run('SET', 'k', 'v', 'BOGUS')).toEqual(err('ERR syntax error'))
		expect(run('SET', 'k', 'v', 'EX', '0')).toEqual(err("ERR invalid expire time in 'set' command"))
		expect(run('SETNX', 'k', 'x')).toBe(0)
		expect(run('SETNX', 'new', 'x')).toBe(1)
		expect(run('GETSET', 'new', 'y')).toBe('x')
		expect(run('GETDEL', 'new')).toBe('y')
		expect(run('GET', 'new')).toBeNull()
		expect(run('MSET', 'a', '1', 'b', '2')).toBe('OK')
		expect(run('MGET', 'a', 'b', 'nope')).toEqual(['1', '2', null])
		expect(run('MSETNX', 'a', '1', 'c', '3')).toBe(0)
		expect(run('MSETNX', 'c', '3', 'd', '4')).toBe(1)
		expect(run('STRLEN', 'a')).toBe(1)
		expect(run('APPEND', 'a', '23')).toBe(3)
		expect(run('GETRANGE', 'a', '0', '1')).toBe('12')
		expect(run('GETRANGE', 'a', '-2', '-1')).toBe('23')
		expect(run('SETRANGE', 'a', '5', 'x')).toBe(6)
		expect(run('GET', 'a')).toBe('123\0\0x')
	})

	it('increments with 64-bit semantics', () => {
		expect(run('INCR', 'n')).toBe(1)
		expect(run('INCRBY', 'n', '9')).toBe(10)
		expect(run('DECR', 'n')).toBe(9)
		expect(run('DECRBY', 'n', '10')).toBe(-1)
		expect(run('GET', 'n')).toBe('-1')
		expect(run('SET', 'big', '9223372036854775806')).toBe('OK')
		expect(run('INCR', 'big')).toBe(9223372036854775807n)
		expect(run('INCR', 'big')).toEqual(err('ERR increment or decrement would overflow'))
		expect(run('SET', 's', 'abc')).toBe('OK')
		expect(run('INCR', 's')).toEqual(err('ERR value is not an integer or out of range'))
		expect(run('INCRBY', 'n', '1.5')).toEqual(err('ERR value is not an integer or out of range'))
	})

	it('increments floats with redis formatting', () => {
		expect(run('SET', 'f', '10.5')).toBe('OK')
		expect(run('INCRBYFLOAT', 'f', '0.1')).toBe('10.6')
		expect(run('INCRBYFLOAT', 'f', '-7.6')).toBe('3')
		expect(run('INCRBYFLOAT', 'f', 'abc')).toEqual(err('ERR value is not a valid float'))
		expect(run('INCRBYFLOAT', 'f', 'inf')).toEqual(err('ERR increment would produce NaN or Infinity'))
	})

	it('rejects the wrong type', () => {
		run('LPUSH', 'list', 'a')
		expect(run('GET', 'list')).toEqual(err('WRONGTYPE Operation against a key holding the wrong kind of value'))
		expect(run('INCR', 'list')).toEqual(err('WRONGTYPE Operation against a key holding the wrong kind of value'))
		expect(run('SET', 'list', 'x')).toBe('OK')
		expect(run('TYPE', 'list')).toBe('string')
	})
})

describe('expiry', () => {
	const ctx = createEngine()
	const { run, advance } = ctx

	it('expires keys lazily and reports ttl', () => {
		expect(run('TTL', 'missing')).toBe(-2)
		run('SET', 'k', 'v')
		expect(run('TTL', 'k')).toBe(-1)
		expect(run('EXPIRE', 'k', '10')).toBe(1)
		expect(run('TTL', 'k')).toBe(10)
		expect(run('PTTL', 'k')).toBe(10000)
		advance(9999)
		expect(run('GET', 'k')).toBe('v')
		advance(1)
		expect(run('GET', 'k')).toBeNull()
		expect(run('EXISTS', 'k')).toBe(0)
		expect(run('EXPIRE', 'k', '10')).toBe(0)
	})

	it('supports set expiry options and keepttl', () => {
		run('SET', 'k', 'v', 'PX', '5000')
		expect(run('PTTL', 'k')).toBe(5000)
		run('SET', 'k', 'v2')
		expect(run('PTTL', 'k')).toBe(-1)
		run('SET', 'k', 'v', 'EX', '5')
		run('SET', 'k', 'v3', 'KEEPTTL')
		expect(run('TTL', 'k')).toBe(5)
		run('SETEX', 'k', '7', 'v')
		expect(run('TTL', 'k')).toBe(7)
		run('PSETEX', 'k', '700', 'v')
		expect(run('PTTL', 'k')).toBe(700)
		expect(run('PERSIST', 'k')).toBe(1)
		expect(run('PERSIST', 'k')).toBe(0)
		expect(run('TTL', 'k')).toBe(-1)
	})

	it('handles nx xx gt lt and absolute times', () => {
		run('SET', 'k', 'v')
		expect(run('EXPIRE', 'k', '10', 'XX')).toBe(0)
		expect(run('EXPIRE', 'k', '10', 'NX')).toBe(1)
		expect(run('EXPIRE', 'k', '20', 'NX')).toBe(0)
		expect(run('EXPIRE', 'k', '5', 'GT')).toBe(0)
		expect(run('EXPIRE', 'k', '20', 'GT')).toBe(1)
		expect(run('EXPIRE', 'k', '30', 'LT')).toBe(0)
		expect(run('EXPIRE', 'k', '5', 'LT')).toBe(1)
		expect(run('EXPIRE', 'k', '5', 'NX', 'XX')).toEqual(
			err('ERR NX and XX, GT or LT options at the same time are not compatible')
		)
		const at = ctx.now + 60_000
		expect(run('PEXPIREAT', 'k', String(at))).toBe(1)
		expect(run('PEXPIRETIME', 'k')).toBe(at)
		expect(run('EXPIRETIME', 'k')).toBe(Math.floor(at / 1000))
		expect(run('EXPIREAT', 'k', '1')).toBe(1)
		expect(run('EXISTS', 'k')).toBe(0)
	})

	it('sweeps expired keys in the background', () => {
		const { engine, run, advance } = createEngine()
		run('SET', 'k', 'v', 'PX', '10')
		advance(11)
		engine.databases[0]!.sweep(engine.now)
		expect(engine.databases[0]!.size).toBe(0)
	})

	it('expires hash fields', () => {
		run('HSET', 'h', 'a', '1', 'b', '2', 'c', '3')
		expect(run('HPEXPIRE', 'h', '1000', 'FIELDS', '2', 'a', 'nope')).toEqual([1, -2])
		expect(run('HEXPIRE', 'h', '10', 'NX', 'FIELDS', '1', 'a')).toEqual([0])
		expect(run('HEXPIRE', 'h', '10', 'XX', 'FIELDS', '1', 'b')).toEqual([0])
		expect(run('HPTTL', 'h', 'FIELDS', '3', 'a', 'b', 'nope')).toEqual([1000, -1, -2])
		expect(run('HTTL', 'h', 'FIELDS', '1', 'a')).toEqual([1])
		expect(run('HPEXPIRETIME', 'h', 'FIELDS', '1', 'a')).toEqual([ctx.now + 1000])
		expect(run('HPERSIST', 'h', 'FIELDS', '2', 'a', 'b')).toEqual([1, -1])
		expect(run('HPTTL', 'h', 'FIELDS', '1', 'a')).toEqual([-1])
		expect(run('HPEXPIRE', 'h', '0', 'FIELDS', '1', 'c')).toEqual([2])
		expect(run('HLEN', 'h')).toBe(2)
		expect(run('HPEXPIRE', 'h', '500', 'FIELDS', '2', 'a', 'b')).toEqual([1, 1])
		advance(500)
		expect(run('HGETALL', 'h')).toEqual([])
		expect(run('EXISTS', 'h')).toBe(0)
		expect(run('HPEXPIRE', 'h', '500', 'FIELDS', '1', 'a')).toEqual([-2])
		expect(run('HPEXPIRE', 'h', '500', 'FIELDS', '2', 'a')).toEqual(
			err('ERR The `numFields` parameter must match the number of arguments')
		)
	})
})

describe('hashes', () => {
	const { run } = createEngine()

	it('sets, reads and removes fields', () => {
		expect(run('HSET', 'h', 'a', '1', 'b', '2')).toBe(2)
		expect(run('HSET', 'h', 'a', '3', 'c', '4')).toBe(1)
		expect(run('HGET', 'h', 'a')).toBe('3')
		expect(run('HGET', 'h', 'x')).toBeNull()
		expect(run('HMGET', 'h', 'a', 'x')).toEqual(['3', null])
		expect(run('HGETALL', 'h')).toEqual(['a', '3', 'b', '2', 'c', '4'])
		expect(run('HKEYS', 'h')).toEqual(['a', 'b', 'c'])
		expect(run('HVALS', 'h')).toEqual(['3', '2', '4'])
		expect(run('HLEN', 'h')).toBe(3)
		expect(run('HEXISTS', 'h', 'a')).toBe(1)
		expect(run('HSETNX', 'h', 'a', '9')).toBe(0)
		expect(run('HSETNX', 'h', 'd', '9')).toBe(1)
		expect(run('HSTRLEN', 'h', 'd')).toBe(1)
		expect(run('HMSET', 'h', 'e', '5')).toBe('OK')
		expect(run('HINCRBY', 'h', 'a', '2')).toBe(5)
		expect(run('HINCRBYFLOAT', 'h', 'a', '0.5')).toBe('5.5')
		expect(run('HINCRBY', 'h', 'a', '1')).toEqual(err('ERR hash value is not an integer'))
		expect(run('HRANDFIELD', 'h')).toBeTypeOf('string')
		expect(run('HRANDFIELD', 'h', '2', 'WITHVALUES')).toHaveLength(4)
		expect(run('HRANDFIELD', 'h', '-10')).toHaveLength(10)
		expect(run('HSCAN', 'h', '0', 'MATCH', 'a')).toEqual(['0', ['a', '5.5']])
		expect(run('HDEL', 'h', 'a', 'b', 'c', 'd', 'e', 'zzz')).toBe(5)
		expect(run('EXISTS', 'h')).toBe(0)
		expect(run('HGETALL', 'h')).toEqual([])
		expect(run('HSET', 'h', 'a')).toEqual(err("ERR wrong number of arguments for 'hset' command"))
	})
})

describe('lists', () => {
	const { run } = createEngine()

	it('pushes, pops and ranges', () => {
		expect(run('RPUSH', 'l', 'a', 'b', 'c')).toBe(3)
		expect(run('LPUSH', 'l', 'z')).toBe(4)
		expect(run('LPUSHX', 'nope', 'x')).toBe(0)
		expect(run('LRANGE', 'l', '0', '-1')).toEqual(['z', 'a', 'b', 'c'])
		expect(run('LRANGE', 'l', '5', '10')).toEqual([])
		expect(run('LINDEX', 'l', '-1')).toBe('c')
		expect(run('LLEN', 'l')).toBe(4)
		expect(run('LPOP', 'l')).toBe('z')
		expect(run('RPOP', 'l', '2')).toEqual(['c', 'b'])
		expect(run('RPOP', 'nope')).toBeNull()
		expect(run('RPOP', 'nope', '2')).toBeNull()
		expect(run('LSET', 'l', '5', 'x')).toEqual(err('ERR index out of range'))
		expect(run('LSET', 'l', '0', 'x')).toBe('OK')
		expect(run('LINSERT', 'l', 'BEFORE', 'x', 'w')).toBe(2)
		expect(run('LINSERT', 'l', 'AFTER', 'nope', 'w')).toBe(-1)
		expect(run('RPUSH', 'l', 'x', 'y', 'x')).toBe(5)
		expect(run('LPOS', 'l', 'x')).toBe(1)
		expect(run('LPOS', 'l', 'x', 'RANK', '-1')).toBe(4)
		expect(run('LPOS', 'l', 'x', 'COUNT', '0')).toEqual([1, 2, 4])
		expect(run('LREM', 'l', '-1', 'x')).toBe(1)
		expect(run('LREM', 'l', '0', 'x')).toBe(2)
		expect(run('LRANGE', 'l', '0', '-1')).toEqual(['w', 'y'])
		expect(run('LTRIM', 'l', '1', '-1')).toBe('OK')
		expect(run('LRANGE', 'l', '0', '-1')).toEqual(['y'])
		expect(run('LMOVE', 'l', 'l2', 'LEFT', 'RIGHT')).toBe('y')
		expect(run('EXISTS', 'l')).toBe(0)
		expect(run('RPOPLPUSH', 'l2', 'l3')).toBe('y')
		expect(run('LMPOP', '2', 'l', 'l3', 'LEFT', 'COUNT', '5')).toEqual(['l3', ['y']])
		expect(run('LMPOP', '1', 'l', 'LEFT')).toBeNull()
	})
})

describe('sets', () => {
	const { run } = createEngine()

	it('adds, combines and removes members', () => {
		expect(run('SADD', 's', 'a', 'b', 'c', 'a')).toBe(3)
		expect(run('SCARD', 's')).toBe(3)
		expect(run('SISMEMBER', 's', 'a')).toBe(1)
		expect(run('SMISMEMBER', 's', 'a', 'z')).toEqual([1, 0])
		expect((run('SMEMBERS', 's') as string[]).toSorted()).toEqual(['a', 'b', 'c'])
		run('SADD', 't', 'b', 'c', 'd')
		expect((run('SINTER', 's', 't') as string[]).toSorted()).toEqual(['b', 'c'])
		expect((run('SUNION', 's', 't') as string[]).toSorted()).toEqual(['a', 'b', 'c', 'd'])
		expect(run('SDIFF', 's', 't')).toEqual(['a'])
		expect(run('SINTERSTORE', 'u', 's', 't')).toBe(2)
		expect(run('SINTERCARD', '2', 's', 't', 'LIMIT', '1')).toBe(1)
		expect(run('SMOVE', 's', 't', 'a')).toBe(1)
		expect(run('SISMEMBER', 't', 'a')).toBe(1)
		expect(run('SRANDMEMBER', 't', '-5')).toHaveLength(5)
		expect(run('SPOP', 't', '10')).toHaveLength(4)
		expect(run('EXISTS', 't')).toBe(0)
		expect(run('SPOP', 't')).toBeNull()
		expect(run('SREM', 's', 'b', 'c')).toBe(2)
		expect(run('EXISTS', 's')).toBe(0)
		expect(run('SSCAN', 'u', '0')).toEqual(['0', expect.arrayContaining(['b', 'c'])])
	})
})

describe('sorted sets', () => {
	const { run } = createEngine()

	it('adds with options and formats scores', () => {
		expect(run('ZADD', 'z', '1', 'one', '2', 'two', '3', 'three')).toBe(3)
		expect(run('ZADD', 'z', 'XX', '10', 'nope')).toBe(0)
		expect(run('ZADD', 'z', 'NX', '10', 'one')).toBe(0)
		expect(run('ZADD', 'z', 'CH', '1.5', 'one', '4', 'four')).toBe(2)
		expect(run('ZADD', 'z', 'GT', 'CH', '1', 'one')).toBe(0)
		expect(run('ZADD', 'z', 'LT', 'CH', '1', 'one')).toBe(1)
		expect(run('ZADD', 'z', 'INCR', '0.5', 'one')).toBe('1.5')
		expect(run('ZADD', 'z', 'nan', 'x')).toEqual(err('ERR value is not a valid float'))
		expect(run('ZADD', 'z', 'inf', 'inf', '-inf', 'ninf')).toBe(2)
		expect(run('ZSCORE', 'z', 'inf')).toBe('inf')
		expect(run('ZSCORE', 'z', 'ninf')).toBe('-inf')
		expect(run('ZSCORE', 'z', 'missing')).toBeNull()
		expect(run('ZMSCORE', 'z', 'one', 'missing')).toEqual(['1.5', null])
		expect(run('ZINCRBY', 'z', '5.83', 'one')).toBe('7.33')
		expect(run('ZCARD', 'z')).toBe(6)
		expect(run('ZREM', 'z', 'inf', 'ninf', 'nope')).toBe(2)
	})

	it('ranks and ranges', () => {
		expect(run('ZRANK', 'z', 'two')).toBe(0)
		expect(run('ZRANK', 'z', 'nope')).toBeNull()
		expect(run('ZREVRANK', 'z', 'two')).toBe(3)
		expect(run('ZRANK', 'z', 'two', 'WITHSCORE')).toEqual([0, '2'])
		expect(run('ZRANGE', 'z', '0', '-1')).toEqual(['two', 'three', 'four', 'one'])
		expect(run('ZRANGE', 'z', '0', '0', 'REV')).toEqual(['one'])
		expect(run('ZRANGE', 'z', '1', '2', 'REV', 'WITHSCORES')).toEqual(['four', '4', 'three', '3'])
		expect(run('ZREVRANGE', 'z', '0', '1')).toEqual(['one', 'four'])
		expect(run('ZRANGE', 'z', '(2', '4', 'BYSCORE')).toEqual(['three', 'four'])
		expect(run('ZRANGE', 'z', '+inf', '-inf', 'BYSCORE', 'REV', 'LIMIT', '1', '2')).toEqual(['four', 'three'])
		expect(run('ZRANGEBYSCORE', 'z', '-inf', '+inf', 'WITHSCORES', 'LIMIT', '0', '1')).toEqual(['two', '2'])
		expect(run('ZREVRANGEBYSCORE', 'z', '+inf', '3')).toEqual(['one', 'four', 'three'])
		expect(run('ZCOUNT', 'z', '2', '(4')).toBe(2)
		expect(run('ZRANGE', 'z', '0', '-1', 'LIMIT', '0', '1')).toEqual(
			err('ERR syntax error, LIMIT is only supported in combination with either BYSCORE or BYLEX')
		)
		expect(run('ZRANGE', 'z', 'a', 'b', 'BYSCORE')).toEqual(err('ERR min or max is not a float'))
	})

	it('ranges by lex', () => {
		run('ZADD', 'lex', '0', 'alpha', '0', 'bravo', '0', 'charlie', '0', 'delta')
		expect(run('ZRANGEBYLEX', 'lex', '[bravo', '[charlie')).toEqual(['bravo', 'charlie'])
		expect(run('ZRANGE', 'lex', '(bravo', '+', 'BYLEX')).toEqual(['charlie', 'delta'])
		expect(run('ZRANGE', 'lex', '+', '-', 'BYLEX', 'REV', 'LIMIT', '0', '2')).toEqual(['delta', 'charlie'])
		expect(run('ZREVRANGEBYLEX', 'lex', '[charlie', '-')).toEqual(['charlie', 'bravo', 'alpha'])
		expect(run('ZLEXCOUNT', 'lex', '-', '+')).toBe(4)
		expect(run('ZRANGEBYLEX', 'lex', 'bravo', 'charlie')).toEqual(err('ERR min or max not valid string range item'))
		expect(run('ZREMRANGEBYLEX', 'lex', '[alpha', '(charlie')).toBe(2)
		expect(run('ZRANGE', 'lex', '0', '-1')).toEqual(['charlie', 'delta'])
	})

	it('pops, removes ranges and stores', () => {
		expect(run('ZPOPMIN', 'z')).toEqual(['two', '2'])
		expect(run('ZPOPMAX', 'z', '2')).toEqual(['one', '7.33', 'four', '4'])
		expect(run('ZPOPMIN', 'empty')).toEqual([])
		expect(run('ZRANGE', 'z', '0', '-1')).toEqual(['three'])
		run('ZADD', 'a', '1', 'x', '2', 'y')
		run('ZADD', 'b', '10', 'y', '20', 'w')
		run('SADD', 'c', 'x')
		expect(run('ZUNION', '2', 'a', 'b', 'WITHSCORES')).toEqual(['x', '1', 'y', '12', 'w', '20'])
		expect(run('ZUNIONSTORE', 'dst', '2', 'a', 'b', 'WEIGHTS', '1', '2', 'AGGREGATE', 'MAX')).toBe(3)
		expect(run('ZRANGE', 'dst', '0', '-1', 'WITHSCORES')).toEqual(['x', '1', 'y', '20', 'w', '40'])
		expect(run('ZINTER', '2', 'a', 'c', 'WITHSCORES')).toEqual(['x', '2'])
		expect(run('ZINTERSTORE', 'dst', '2', 'a', 'b', 'AGGREGATE', 'MIN')).toBe(1)
		expect(run('ZINTERCARD', '2', 'a', 'b')).toBe(1)
		expect(run('ZDIFF', '2', 'a', 'b')).toEqual(['x'])
		expect(run('ZDIFFSTORE', 'dst', '2', 'a', 'b')).toBe(1)
		expect(run('ZRANGESTORE', 'dst', 'a', '0', '-1')).toBe(2)
		expect(run('ZREMRANGEBYSCORE', 'dst', '-inf', '1')).toBe(1)
		expect(run('ZREMRANGEBYRANK', 'dst', '0', '-1')).toBe(1)
		expect(run('EXISTS', 'dst')).toBe(0)
		expect(run('ZRANDMEMBER', 'a')).toBeTypeOf('string')
		expect(run('ZRANDMEMBER', 'a', '5', 'WITHSCORES')).toHaveLength(4)
		expect(run('ZSCAN', 'a', '0')).toEqual(['0', ['x', '1', 'y', '2']])
	})

	it('orders by score then member bytes', () => {
		run('ZADD', 'o', '1', 'b', '1', 'a', '0', 'z')
		expect(run('ZRANGE', 'o', '0', '-1')).toEqual(['z', 'a', 'b'])
	})
})

describe('keyspace', () => {
	const { run, engine } = createEngine({ databases: 4 })

	it('manages keys', () => {
		run('SET', 'a', '1')
		run('SET', 'b', '2')
		expect(run('EXISTS', 'a', 'a', 'nope')).toBe(2)
		expect(run('DBSIZE')).toBe(2)
		expect(run('TYPE', 'nope')).toBe('none')
		expect(run('RENAME', 'a', 'c')).toBe('OK')
		expect(run('RENAME', 'nope', 'c')).toEqual(err('ERR no such key'))
		expect(run('RENAMENX', 'c', 'b')).toBe(0)
		expect(run('RENAMENX', 'c', 'a')).toBe(1)
		expect((run('KEYS', '*') as string[]).toSorted()).toEqual(['a', 'b'])
		expect(run('KEYS', 'z*')).toEqual([])
		expect(run('RANDOMKEY')).toMatch(/^[ab]$/)
		expect(run('COPY', 'a', 'a2')).toBe(1)
		expect(run('COPY', 'a', 'a2')).toBe(0)
		expect(run('COPY', 'a', 'a2', 'REPLACE')).toBe(1)
		expect(run('MOVE', 'a2', '1')).toBe(1)
		expect(run('SELECT', '1')).toBe('OK')
		expect(run('GET', 'a2')).toBe('1')
		expect(run('SELECT', '4')).toEqual(err('ERR DB index is out of range'))
		expect(run('SWAPDB', '0', '1')).toBe('OK')
		expect(run('DBSIZE')).toBe(2)
		expect(run('SELECT', '0')).toBe('OK')
		expect(run('DBSIZE')).toBe(1)
		expect(run('UNLINK', 'a2')).toBe(1)
		expect(run('DEL', 'a', 'b', 'nope')).toBe(0)
		expect(run('OBJECT', 'ENCODING', 'nope')).toBeNull()
		engine.flushAll()
		expect(run('SELECT', '1')).toBe('OK')
		expect(run('DBSIZE')).toBe(0)
	})

	it('scans with a cursor', () => {
		run('SELECT', '0')
		for (let i = 0; i < 25; i++) {
			run('SET', `k${i}`, 'v')
		}
		run('LPUSH', 'list', 'x')

		const seen: string[] = []
		let cursor = '0'

		do {
			const [next, keys] = run('SCAN', cursor, 'COUNT', '10') as [string, string[]]
			seen.push(...keys)
			cursor = next
		} while (cursor !== '0')

		expect(seen).toHaveLength(26)
		expect(run('SCAN', '0', 'MATCH', 'k1*', 'COUNT', '100')).toEqual(['0', expect.arrayContaining(['k1', 'k10'])])
		expect(run('SCAN', '0', 'TYPE', 'list')).toEqual(['0', ['list']])
		expect(run('SCAN', 'x')).toEqual(err('ERR invalid cursor'))
		expect(run('FLUSHDB', 'ASYNC')).toBe('OK')
		expect(run('DBSIZE')).toBe(0)
	})
})

describe('transactions', () => {
	const { run, newClient } = createEngine()

	it('queues and executes', () => {
		expect(run('EXEC')).toEqual(err('ERR EXEC without MULTI'))
		expect(run('DISCARD')).toEqual(err('ERR DISCARD without MULTI'))
		expect(run('MULTI')).toBe('OK')
		expect(run('MULTI')).toEqual(err('ERR MULTI calls can not be nested'))
		expect(run('SET', 'a', '1')).toBe('QUEUED')
		expect(run('INCR', 'a')).toBe('QUEUED')
		expect(run('LPUSH', 'a', 'x')).toBe('QUEUED')
		expect(run('GET', 'a')).toBe('QUEUED')
		expect(run('EXEC')).toEqual([
			'OK',
			2,
			err('WRONGTYPE Operation against a key holding the wrong kind of value'),
			'2',
		])
	})

	it('aborts on syntax errors', () => {
		run('MULTI')
		expect(run('SET', 'a')).toEqual(err("ERR wrong number of arguments for 'set' command"))
		expect(run('NOPE')).toEqual(err("ERR unknown command 'NOPE', with args beginning with: "))
		expect(run('SET', 'a', '9')).toBe('QUEUED')
		expect(run('EXEC')).toEqual(err('EXECABORT Transaction discarded because of previous errors.'))
		expect(run('GET', 'a')).toBe('2')
	})

	it('discards', () => {
		run('MULTI')
		run('SET', 'a', '9')
		expect(run('DISCARD')).toBe('OK')
		expect(run('GET', 'a')).toBe('2')
	})

	it('watches keys', () => {
		const other = newClient()
		expect(run('WATCH', 'a')).toBe('OK')
		other.run('SET', 'a', 'changed')
		run('MULTI')
		run('SET', 'a', 'mine')
		expect(run('EXEC')).toBeNull()
		expect(run('GET', 'a')).toBe('changed')

		run('WATCH', 'a')
		run('MULTI')
		run('SET', 'a', 'mine')
		expect(run('EXEC')).toEqual(['OK'])

		run('WATCH', 'a')
		expect(run('UNWATCH')).toBe('OK')
		other.run('SET', 'a', 'changed')
		run('MULTI')
		expect(run('WATCH', 'a')).toEqual(err('ERR WATCH inside MULTI is not allowed'))
		run('DISCARD')

		run('WATCH', 'a')
		other.run('FLUSHDB')
		run('MULTI')
		expect(run('EXEC')).toBeNull()
	})

	it('watches expiring keys', () => {
		const { run, advance } = createEngine()
		run('SET', 'a', '1', 'PX', '10')
		run('WATCH', 'a')
		advance(11)
		run('MULTI')
		run('SET', 'b', '1')
		expect(run('EXEC')).toBeNull()
	})
})

describe('pub/sub', () => {
	const { run, newClient, engine } = createEngine()

	it('delivers messages and confirmations', () => {
		const sub = newClient()
		const psub = newClient()

		expect(sub.run('SUBSCRIBE', 'a', 'b')).toBeNull()
		expect(sub.messages).toEqual([
			['subscribe', 'a', 1],
			['subscribe', 'b', 2],
		])
		expect(psub.run('PSUBSCRIBE', 'a*')).toBeNull()
		expect(psub.messages).toEqual([['psubscribe', 'a*', 1]])

		expect(run('PUBLISH', 'a', 'hello')).toBe(2)
		expect(run('PUBLISH', 'c', 'nobody')).toBe(0)
		expect(sub.messages[2]).toEqual(['message', 'a', 'hello'])
		expect(psub.messages[1]).toEqual(['pmessage', 'a*', 'a', 'hello'])

		expect(run('PUBSUB', 'CHANNELS')).toEqual(expect.arrayContaining(['a', 'b']))
		expect(run('PUBSUB', 'NUMSUB', 'a', 'zzz')).toEqual(['a', 1, 'zzz', 0])
		expect(run('PUBSUB', 'NUMPAT')).toBe(1)

		expect(sub.run('GET', 'x')).toEqual(
			err(
				"ERR Can't execute 'get': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context"
			)
		)
		expect(sub.run('PING')).toEqual(['pong', ''])
		expect(sub.run('PING', 'x')).toEqual(['pong', 'x'])

		sub.messages.length = 0
		sub.run('UNSUBSCRIBE', 'a')
		expect(sub.messages).toEqual([['unsubscribe', 'a', 1]])
		sub.run('UNSUBSCRIBE')
		expect(sub.messages[1]).toEqual(['unsubscribe', 'b', 0])
		sub.messages.length = 0
		sub.run('UNSUBSCRIBE')
		expect(sub.messages).toEqual([['unsubscribe', null, 0]])
		expect(sub.run('GET', 'x')).toBeNull()

		psub.run('RESET')
		expect(engine.patterns.size).toBe(0)
		expect(run('PUBSUB', 'NUMPAT')).toBe(0)
	})

	it('supports shard channels', () => {
		const sub = newClient()
		sub.run('SSUBSCRIBE', 's')
		expect(sub.messages).toEqual([['ssubscribe', 's', 1]])
		expect(run('SPUBLISH', 's', 'm')).toBe(1)
		expect(run('PUBLISH', 's', 'm')).toBe(0)
		expect(sub.messages[1]).toEqual(['smessage', 's', 'm'])
		expect(run('PUBSUB', 'SHARDNUMSUB', 's')).toEqual(['s', 1])
		expect(run('PUBSUB', 'SHARDCHANNELS')).toEqual(['s'])
		engine.releaseConnection(sub.conn)
		expect(run('PUBSUB', 'SHARDCHANNELS')).toEqual([])
	})
})

describe('scripting', () => {
	const { run } = createEngine()
	const sha = (body: string) => createHash('sha1').update(body).digest('hex')

	it('converts replies both ways', () => {
		run('SET', 's', 'str')
		run('SET', 'n', '5')
		run('RPUSH', 'l', 'a', 'b')

		expect(run('EVAL', "return redis.call('get', 's')", '0')).toBe('str')
		expect(run('EVAL', "return redis.call('incr', 'n')", '0')).toBe(6)
		expect(run('EVAL', "return redis.call('get', 'missing')", '0')).toBeNull()
		expect(run('EVAL', "return redis.call('get', 'missing') == false", '0')).toBe(1)
		expect(run('EVAL', 'return redis.replicate_commands()', '0')).toBe(1)
		expect(run('EVAL', "return redis.call('lrange', 'l', 0, -1)", '0')).toEqual(['a', 'b'])
		expect(run('EVAL', "return redis.call('set', 'x', 'y')", '0')).toBe('OK')
		expect(run('EVAL', "return redis.call('set', 'x', 'y').ok", '0')).toBe('OK')
		expect(run('EVAL', "return redis.pcall('incr', 's').err", '0')).toBe(
			'ERR value is not an integer or out of range'
		)

		expect(run('EVAL', 'return 3.99', '0')).toBe(3)
		expect(run('EVAL', 'return -3.99', '0')).toBe(-3)
		expect(run('EVAL', 'return true', '0')).toBe(1)
		expect(run('EVAL', 'return false', '0')).toBeNull()
		expect(run('EVAL', 'return nil', '0')).toBeNull()
		expect(run('EVAL', "return {1, 'two', nil, 4}", '0')).toEqual([1, 'two'])
		expect(run('EVAL', "return {ok='fine'}", '0')).toBe('fine')
		expect(run('EVAL', "return {err='MY custom'}", '0')).toEqual(err('MY custom'))
		expect(run('EVAL', "return redis.error_reply('boom')", '0')).toEqual(err('boom'))
		expect(run('EVAL', "return redis.status_reply('yes')", '0')).toBe('yes')
		expect(run('EVAL', "return {1, {2, {3, 'x'}}}", '0')).toEqual([1, [2, [3, 'x']]])
		expect(run('EVAL', 'return ARGV[1] + ARGV[2]', '0', '1', '2')).toBe(3)
		expect(run('EVAL', 'return KEYS[1] .. ARGV[1]', '1', 'k', 'v')).toBe('kv')
		expect(run('EVAL', 'return #KEYS + #ARGV', '2', 'a', 'b', 'c')).toBe(3)
		expect(run('EVAL', "return redis.call('set', KEYS[1], 3.5)", '1', 'float')).toBe('OK')
		expect(run('GET', 'float')).toBe('3.5')
		expect(run('EVAL', "return redis.call('set', KEYS[1], 10 / 2)", '1', 'float')).toBe('OK')
		expect(run('GET', 'float')).toBe('5')
	})

	it('reports errors like redis', () => {
		const body = "return redis.call('incr', 's')"
		expect(run('EVAL', body, '0')).toEqual(
			err(`ERR value is not an integer or out of range script: ${sha(body)}, on @user_script:1.`)
		)
		expect(run('EVAL', 'return 1 + nil', '0')).toEqual(
			err(expect.stringMatching(/^ERR user_script:1: attempt to perform arithmetic on a nil value.* script: /))
		)
		expect(run('EVAL', 'return (', '0')).toEqual(err(expect.stringMatching(/^ERR Error compiling script/)))
		expect(run('EVAL', 'return redis.call()', '0')).toEqual(
			err(expect.stringMatching(/^ERR Please specify at least one argument for this redis lib call/))
		)
		expect(run('EVAL', "return redis.call('get', {})", '0')).toEqual(
			err(expect.stringMatching(/^ERR Lua redis lib command arguments must be strings or integers/))
		)
		expect(run('EVAL', 'x = 1', '0')).toEqual(
			err(expect.stringMatching(/Script attempted to create global variable 'x'/))
		)
		expect(run('EVAL', 'return y', '0')).toEqual(
			err(expect.stringMatching(/Script attempted to access nonexistent global variable 'y'/))
		)
		expect(run('EVAL', "return redis.call('eval', 'return 1', 0)", '0')).toEqual(
			err(expect.stringMatching(/^ERR This Redis command is not allowed from script/))
		)
		expect(run('EVAL', "return redis.call('multi')", '0')).toEqual(
			err(expect.stringMatching(/^ERR This Redis command is not allowed from script/))
		)
		expect(run('EVAL_RO', "return redis.call('set', 'a', '1')", '0')).toEqual(
			err(expect.stringMatching(/^ERR Write commands are not allowed from read-only scripts/))
		)
		expect(run('EVAL_RO', "return redis.call('get', 's')", '0')).toBe('str')
		expect(run('EVAL', 'return 1', '-1')).toEqual(err("ERR Number of keys can't be negative"))
		expect(run('EVAL', 'return 1', '2', 'a')).toEqual(
			err("ERR Number of keys can't be greater than number of args")
		)
	})

	it('caches scripts by sha1', () => {
		const body = 'return ARGV[1]'
		const hash = sha(body)
		expect(run('EVALSHA', hash, '0', 'x')).toEqual(err('NOSCRIPT No matching script. Please use EVAL.'))
		expect(run('SCRIPT', 'EXISTS', hash)).toEqual([0])
		expect(run('SCRIPT', 'LOAD', body)).toBe(hash)
		expect(run('SCRIPT', 'EXISTS', hash, sha('nope'))).toEqual([1, 0])
		expect(run('EVALSHA', hash.toUpperCase(), '0', 'x')).toBe('x')
		expect(run('EVALSHA_RO', hash, '0', 'y')).toBe('y')
		expect(run('SCRIPT', 'FLUSH')).toBe('OK')
		expect(run('SCRIPT', 'EXISTS', hash)).toEqual([0])
		expect(run('EVAL', body, '0', 'z')).toBe('z')
		expect(run('SCRIPT', 'EXISTS', hash)).toEqual([1])
		expect(run('SCRIPT', 'FLUSH', 'ASYNC')).toBe('OK')
		expect(run('SCRIPT', 'KILL')).toEqual(err('ERR the local redis server does not support SCRIPT KILL'))
	})

	it('exposes helpers and cjson', () => {
		expect(run('EVAL', "return redis.sha1hex('abc')", '0')).toBe(sha('abc'))
		expect(run('EVAL', "redis.log(redis.LOG_WARNING, 'x'); return redis.LOG_NOTICE", '0')).toBe(2)
		expect(run('EVAL', "return cjson.encode({a=1, b={1,2,3}, c='x', d=true, e=1.5})", '0')).toBe(
			'{"a":1,"b":[1,2,3],"c":"x","d":true,"e":1.5}'
		)
		expect(run('EVAL', 'return cjson.encode({})', '0')).toBe('{}')
		expect(run('EVAL', 'return cjson.encode({1, 2})', '0')).toBe('[1,2]')
		expect(
			run(
				'EVAL',
				'local t = cjson.decode(\'{"a":[1,2,{"b":null}],"c":"str"}\'); return {t.a[1], t.a[2], t.a[3].b == cjson.null, t.c}',
				'0'
			)
		).toEqual([1, 2, 1, 'str'])
		expect(
			run('EVAL', "return string.format('%d-%s', 5, 'x') .. table.concat({'a','b'}, ',') .. math.max(1, 3)", '0')
		).toBe('5-xa,b3')
		expect(run('EVAL', "return string.upper('héllo')", '0')).toBe('HéLLO')
	})

	it('keeps select inside a script local', () => {
		run('SELECT', '0')
		expect(run('EVAL', "redis.call('select', 1); return redis.call('set', 'db1', 'x')", '0')).toBe('OK')
		expect(run('GET', 'db1')).toBeNull()
		run('SELECT', '1')
		expect(run('GET', 'db1')).toBe('x')
		run('FLUSHALL')
		run('SELECT', '0')
	})
})
