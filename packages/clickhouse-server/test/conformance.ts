import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { ClickHouseServer, VERSION } from '../src'

// Every case runs on the in-memory engine & - when the real binary is
// around (or AWSLESS_LOCAL_ENGINE=real downloads it) - on real ClickHouse,
// and both have to answer the same bytes. The snapshots keep the
// verified answers for runs without the binary.
const realAvailable =
	process.env.AWSLESS_LOCAL_ENGINE === 'real' ||
	existsSync(
		join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'awsless', 'clickhouse', VERSION, 'clickhouse')
	)

type Case = {
	name: string
	setup?: string[]
	queries: (string | { sql: string; params?: Record<string, string>; settings?: Record<string, string> })[]
}

const EVENTS = [
	"CREATE TABLE events (id String, projectId LowCardinality(String), visitorId String, externalId Nullable(String), flags Array(LowCardinality(String)), score Float64, bot Enum8('good' = 1, 'bad' = 2, 'not_detected' = 3), country LowCardinality(String) DEFAULT 'NL', createdAt DateTime64(3, 'UTC')) ENGINE = MergeTree PARTITION BY toYYYYMM(createdAt) ORDER BY (projectId, createdAt)",
	`INSERT INTO events FORMAT JSONEachRow
{"id":"a","projectId":"p1","visitorId":"v1","externalId":"u1","flags":["vpn"],"score":3,"bot":"not_detected","createdAt":"2026-10-23T23:30:00.000Z"}
{"id":"b","projectId":"p1","visitorId":"v1","externalId":"u2","flags":[],"score":0,"bot":"good","country":"DE","createdAt":"2026-10-24T08:00:00Z"}
{"id":"c","projectId":"p1","visitorId":"v2","externalId":null,"flags":["tor","vpn"],"score":6.5,"bot":"bad","createdAt":"2026-10-24 09:15:30.250"}
{"id":"d","projectId":"p2","visitorId":"v3","externalId":"u1","flags":["vpn"],"score":1,"bot":"not_detected","country":"US","createdAt":1792900000}
{"id":"e","projectId":"p2","visitorId":"v3","flags":["datacenter"],"score":2.25,"bot":"bad","createdAt":"2026-10-25T00:00:00+02:00"}`,
]

const cases: Case[] = [
	{
		name: 'literals & naming',
		queries: [
			"SELECT 1 + 1, 'a', -3, 1.0, 1.50, 1e3, NULL, true, [1, 2], (1, 'x'), 18446744073709551615, -9223372036854775808",
			"SELECT 1 = 1, 2 * 3 > 5 AND 1, NOT 1, 1 BETWEEN 0 AND 2, 1 IN (1, 2), 'a' LIKE 'a%', 1 IS NULL, CAST(1 AS String), 1::String, if(1, 2, 3)",
			"SELECT CASE WHEN 1 THEN 'a' ELSE 'b' END, CASE 1 WHEN 1 THEN 'x' END, INTERVAL 1 DAY, [1, 2][1], 'ab' || 'c', -(1 + 2)",
			"SELECT toTypeName(1), toTypeName(300), toTypeName(-1), toTypeName(1.5), toTypeName(70000), toTypeName(5000000000), toTypeName('a'), toTypeName([1, 2]), toTypeName(true)",
			'SELECT 0.1 + 0.2 AS a, 1 / 0 AS b, 0 / 0 AS c, -1 / 0 AS d, 10 % 3 AS e, intDiv(7, 2) AS f, 7 / 2 AS g, round(2.5) AS h, round(3.14159, 2) AS i, floor(-1.5) AS j',
			"SELECT 'it''s' AS a, 'tab\\there' AS b, 'slash/path' AS c, 'quote\"d' AS d, 'é' AS e, length('é') AS f, lengthUTF8('é') AS g",
		],
	},
	{
		name: 'strings',
		queries: [
			"SELECT lower('AbC'), upper('abc'), concat('a', 'b', 'c'), substring('hello', 2, 3), substring('hello', -3), startsWith('hello', 'he'), endsWith('hello', 'lo'), position('hello', 'l')",
			"SELECT replaceAll('a-b-c', '-', '+'), replaceRegexpAll('a1b22c', '\\\\d+', '#'), replaceRegexpOne('abc', '(b)', '[\\\\1]'), extract('id=42&x', 'id=(\\\\d+)'), match('abc', '^a.c$'), splitByChar(',', 'a,b,,c'), arrayStringConcat(['a', 'b'], '-')",
			"SELECT trim('  x  '), trimLeft('  x'), trimRight('x  '), reverse('abc'), repeat('ab', 3), leftPad('7', 3, '0'), empty(''), notEmpty('a'), base64Encode('hi'), hex('A'), lower(hex(MD5('a')))",
			"SELECT 'abc' LIKE '%b%', 'abc' NOT LIKE 'a_', 'ABC' ILIKE 'a%', 'a%b' LIKE 'a\\\\%b', concat('a', NULL), coalesce(NULL, 'x'), ifNull(NULL, 1), nullIf(1, 1), toString(123), toUInt32('42')",
			"SELECT JSONExtractString('{\"a\":{\"b\":\"x\"}}', 'a', 'b'), JSONExtractInt('{\"n\":7}', 'n'), JSONHas('{\"n\":7}', 'n'), JSONExtractRaw('{\"a\":[1,2]}', 'a'), JSONExtractKeys('{\"a\":1,\"b\":2}')",
		],
	},
	{
		name: 'dates & time zones',
		queries: [
			"SELECT toDateTime('2026-10-24 07:30:00', 'UTC') AS t, toDate(t) AS d, toDate(t, 'Pacific/Auckland') AS nz, toStartOfHour(t, 'Asia/Kolkata') AS h, toStartOfDay(t, 'America/New_York') AS sd, toTypeName(h), toTypeName(sd)",
			"SELECT toDateTime64('2026-10-24 07:00:00.123', 3, 'UTC') AS a, toDateTime('2026-10-24T07:00:00Z', 'Europe/Amsterdam') AS b, toUnixTimestamp(a), formatDateTime(a, '%Y-%m-%d %H:%i:%S'), toYYYYMM(a), toYYYYMMDD(a), toHour(a), toDayOfWeek(a), toMonth(a), toYear(a)",
			"SELECT toDateTime('2026-10-24 07:30:00', 'UTC') AS t, t + INTERVAL 1 DAY, t - INTERVAL 2 HOUR, t + INTERVAL 1 MONTH, addDays(t, 3), subtractMinutes(t, 5), toDate('2026-01-31') + INTERVAL 1 MONTH, toDate('2026-10-24') + 7",
			"SELECT toStartOfMonth(toDate('2026-10-24')), toMonday(toDate('2026-10-24')), toStartOfWeek(toDate('2026-10-24')), toStartOfYear(toDate('2026-10-24')), toStartOfQuarter(toDate('2026-10-24')), toStartOfInterval(toDateTime('2026-10-24 07:37:00', 'UTC'), INTERVAL 15 MINUTE)",
			"SELECT dateDiff('day', toDate('2026-10-01'), toDate('2026-10-24')), dateDiff('hour', toDateTime('2026-10-24 00:00:00', 'UTC'), toDateTime('2026-10-24 07:30:00', 'UTC')), dateDiff('month', toDate('2026-01-31'), toDate('2026-03-01')), toDate('2026-10-24') - toDate('2026-10-20')",
			{
				sql: "SELECT toDateTime('2026-10-24 07:30:00', 'UTC') AS t, toDateTime64('2026-10-24 07:30:00.5', 3, 'Asia/Tokyo') AS u, toDate('2026-10-24') AS d",
				settings: { date_time_output_format: 'iso' },
			},
			"SELECT toDateTime('2026-03-29 01:30:00', 'UTC') AS t, toStartOfHour(t, 'Europe/Amsterdam'), toDate(t, 'Europe/Amsterdam'), toDateTime('2026-10-25 02:30:00', 'Europe/Amsterdam')",
		],
	},
	{
		name: 'arrays, maps & tuples',
		queries: [
			'SELECT has([1, 2, 3], 2), hasAny([1, 2], [3, 2]), hasAll([1, 2, 3], [1, 3]), indexOf([5, 6], 6), length([1, 2]), arrayConcat([1], [2, 3]), arraySlice([1, 2, 3, 4], 2, 2), arrayReverse([1, 2, 3]), arraySort([3, 1, 2]), arrayDistinct([1, 1, 2])',
			'SELECT arrayMap(x -> x * 2, [1, 2, 3]), arrayFilter(x -> x % 2 = 1, [1, 2, 3]), arrayExists(x -> x > 2, [1, 3]), arrayCount(x -> x > 1, [1, 2, 3]), arraySum([1, 2, 3]), arrayMax([3, 7, 1]), range(5), range(2, 10, 3), arrayElement([1, 2], 5), [1, 2][-1]',
			"SELECT map('a', 1, 'b', 2) AS m, m['a'], m['zz'], mapKeys(m), mapValues(m), mapContains(m, 'b'), tuple(1, 'x').2, (1, 2, 3).1, arrayZip([1, 2], ['a', 'b']), arrayJoin([1, 2]) AS j",
			"SELECT emptyArrayString(), arrayEnumerate(['a', 'b']), arrayUniq([1, 1, 2]), arrayPushBack([1], 2), arrayFlatten([[1], [2, 3]]), arrayIntersect([1, 2, 3], [2, 3, 4]), countEqual([1, 2, 1], 1), arrayStringConcat(['x', 'y'])",
		],
	},
	{
		name: 'tables & inserts',
		setup: EVENTS,
		queries: [
			'SELECT * FROM events ORDER BY id',
			'SELECT id, country, externalId FROM events WHERE externalId IS NULL ORDER BY id',
			"SELECT id FROM events WHERE has(flags, 'vpn') AND score > 1 ORDER BY id",
			"SELECT id FROM events WHERE createdAt >= '2026-10-24 00:00:00' AND createdAt < '2026-10-25' ORDER BY id",
			"SELECT id, bot FROM events WHERE bot IN ('bad', 'good') ORDER BY createdAt DESC LIMIT 2",
			'SELECT id FROM events ORDER BY score DESC LIMIT 2 OFFSET 1',
			'SELECT count() FROM events',
			"SELECT id FROM events WHERE id IN (SELECT id FROM events WHERE country = 'NL') ORDER BY id",
			'SELECT id, (SELECT max(score) FROM events) AS top FROM events WHERE score = top',
		],
	},
	{
		name: 'aggregation',
		setup: EVENTS,
		queries: [
			'SELECT projectId, count(), uniq(visitorId), sum(score), avg(score), min(createdAt), max(score) FROM events GROUP BY projectId ORDER BY projectId',
			"SELECT countIf(bot = 'bad'), sumIf(score, has(flags, 'vpn')), uniqExact(visitorId), groupArray(id), groupUniqArray(projectId), any(projectId), argMax(id, score), argMin(id, score) FROM events",
			'SELECT quantile(0.5)(score), quantiles(0.25, 0.75)(score), median(score), quantileExact(0.5)(score), topK(2)(projectId), count(DISTINCT visitorId), countDistinct(projectId) FROM events',
			"SELECT toDate(createdAt, 'Europe/Amsterdam') AS day, count() AS total FROM events GROUP BY day ORDER BY day",
			'SELECT projectId, count() AS c FROM events GROUP BY projectId HAVING c > 2',
			'SELECT count(), sum(score), avg(score), max(score), min(id), groupArray(id) FROM events WHERE 0',
			'SELECT projectId, visitorId, count() FROM events GROUP BY projectId, visitorId ORDER BY 1, 2',
			'SELECT arrayJoin(flags) AS flag, count() AS c FROM events GROUP BY flag ORDER BY c DESC, flag',
			'SELECT projectId, id FROM events ORDER BY score DESC LIMIT 1 BY projectId',
			'SELECT DISTINCT projectId FROM events ORDER BY projectId',
			'SELECT projectId, groupArray(id) FROM (SELECT * FROM events ORDER BY id) GROUP BY projectId ORDER BY projectId',
			'SELECT visitorId FROM events GROUP BY visitorId HAVING uniq(externalId) > 1',
		],
	},
	{
		name: 'funnels & retention',
		setup: [
			"CREATE TABLE steps (user String, step String, at DateTime('UTC')) ENGINE = MergeTree ORDER BY (user, at)",
			`INSERT INTO steps VALUES ('a', 'visit', '2026-10-24 10:00:00'), ('a', 'signup', '2026-10-24 10:05:00'), ('a', 'pay', '2026-10-24 12:00:00'), ('b', 'visit', '2026-10-24 10:00:00'), ('b', 'pay', '2026-10-24 10:01:00'), ('c', 'signup', '2026-10-24 09:00:00'), ('c', 'visit', '2026-10-24 09:30:00'), ('c', 'signup', '2026-10-24 09:40:00'), ('c', 'pay', '2026-10-24 09:45:00')`,
		],
		queries: [
			"SELECT user, windowFunnel(3600)(at, step = 'visit', step = 'signup', step = 'pay') AS level FROM steps GROUP BY user ORDER BY user",
			"SELECT user, retention(step = 'visit', step = 'signup', step = 'pay') AS r FROM steps GROUP BY user ORDER BY user",
		],
	},
	{
		name: 'joins & array join',
		setup: [
			'CREATE TABLE users (id String, name String) ENGINE = MergeTree ORDER BY id',
			'CREATE TABLE orders (id UInt32, userId String, items Array(String)) ENGINE = MergeTree ORDER BY id',
			"INSERT INTO users VALUES ('u1', 'Ann'), ('u2', 'Bo'), ('u3', 'Cy')",
			"INSERT INTO orders VALUES (1, 'u1', ['x', 'y']), (2, 'u1', []), (3, 'u2', ['z']), (4, 'u9', ['w'])",
		],
		queries: [
			'SELECT o.id, u.name FROM orders AS o INNER JOIN users AS u ON o.userId = u.id ORDER BY o.id',
			'SELECT o.id, u.name FROM orders AS o LEFT JOIN users AS u ON o.userId = u.id ORDER BY o.id',
			'SELECT u.name, count(o.id) FROM users AS u LEFT JOIN orders AS o ON o.userId = u.id GROUP BY u.name ORDER BY u.name',
			'SELECT id, item FROM orders ARRAY JOIN items AS item ORDER BY id, item',
			'SELECT id, items FROM orders LEFT ARRAY JOIN items ORDER BY id, items',
			'SELECT id, arrayJoin(items) AS item FROM orders ORDER BY item',
		],
	},
	{
		name: 'union, with & subqueries',
		queries: [
			'SELECT 1 AS x UNION ALL SELECT 2 ORDER BY x',
			'WITH 2 AS two SELECT two * 3',
			'WITH t AS (SELECT number AS n FROM numbers(5)) SELECT sum(n) FROM t',
			'SELECT number, number * 2 AS double FROM numbers(4) WHERE double > 2',
			'SELECT n FROM (SELECT number AS n FROM numbers(10)) WHERE n % 3 = 0 ORDER BY n DESC',
			'SELECT count() FROM numbers(100) WHERE number IN (SELECT number * 10 FROM numbers(5))',
		],
	},
	{
		name: 'ddl, alter & system tables',
		setup: [
			"CREATE TABLE `stack--t` (id String, d DateTime64(3,'UTC'), e Enum8('a'=1,'b'=2), l LowCardinality(Nullable(String)), m Map(String,UInt32), n INT, s TEXT, b BOOLEAN, x Float64 DEFAULT 1 COMMENT 'hi', INDEX ix id TYPE bloom_filter GRANULARITY 4) ENGINE = MergeTree PARTITION BY toYYYYMM(d) ORDER BY (id, d) TTL toDateTime(d) + INTERVAL 1 YEAR SETTINGS index_granularity = 8192 COMMENT 'awsless:{\"a\":1}'",
			'CREATE TABLE plain (id String) ENGINE = MergeTree ORDER BY id',
		],
		queries: [
			"SELECT name, type, position, default_kind, default_expression, comment FROM system.columns WHERE table = 'stack--t' ORDER BY position",
			'SELECT name, engine, comment, create_table_query, sorting_key, partition_key, primary_key FROM system.tables WHERE database = currentDatabase() ORDER BY name',
			'ALTER TABLE plain ADD COLUMN IF NOT EXISTS score Float64 DEFAULT 0 FIRST',
			"ALTER TABLE plain ADD COLUMN extra UInt8 AFTER id, MODIFY COMMENT 'changed'",
			"SELECT create_table_query FROM system.tables WHERE name = 'plain'",
			'ALTER TABLE plain MODIFY COLUMN score Float32, DROP COLUMN extra, MODIFY TTL now() + INTERVAL 1 DAY, MODIFY SETTING merge_with_ttl_timeout = 3600',
			'ALTER TABLE plain MODIFY COLUMN score Float32, DROP COLUMN extra, MODIFY SETTING merge_with_ttl_timeout = 3600',
			'ALTER TABLE plain MODIFY TTL now() + INTERVAL 1 DAY',
			"SELECT create_table_query FROM system.tables WHERE name = 'plain'",
			'ALTER TABLE plain DROP COLUMN id',
			'EXISTS TABLE plain',
			'SHOW TABLES',
			'DESCRIBE TABLE plain',
		],
	},
	{
		name: 'mutations & final',
		setup: [
			'CREATE TABLE r (id String, v UInt32, name String) ENGINE = ReplacingMergeTree(v) ORDER BY id',
			"INSERT INTO r VALUES ('a', 1, 'old'), ('b', 1, 'b')",
			"INSERT INTO r VALUES ('a', 2, 'new')",
		],
		queries: [
			'SELECT id, v, name FROM r FINAL ORDER BY id',
			"ALTER TABLE r UPDATE name = upper(name) WHERE id = 'b'",
			"DELETE FROM r WHERE v = 1 AND id = 'a'",
			'SELECT id, v, name FROM r ORDER BY id, v',
			'TRUNCATE TABLE r',
			'SELECT count() FROM r',
			'CREATE TABLE m (id String) ENGINE = MergeTree ORDER BY id',
			'SELECT * FROM m FINAL',
		],
	},
	{
		name: 'review cases',
		setup: [
			'CREATE TABLE big (n UInt64) ENGINE = MergeTree ORDER BY n',
			'INSERT INTO big FORMAT JSONEachRow {"n":18446744073709551615} {"n":9007199254740993}',
			'CREATE TABLE pair (a UInt32, b UInt32) ENGINE = MergeTree ORDER BY a',
			'INSERT INTO pair FORMAT JSONCompactEachRow [1,2]',
			"CREATE TABLE dt (d DateTime64(3, 'UTC')) ENGINE = MergeTree ORDER BY d",
			"INSERT INTO dt VALUES ('2026-10-24 07:00:00.1234'), ('2026-10-24 07:00:00.1235')",
			"CREATE TABLE steps (user String, step String, at DateTime('UTC')) ENGINE = MergeTree ORDER BY (user, at)",
			`INSERT INTO steps VALUES ('a', 'visit', '2026-10-24 10:00:00'), ('a', 'signup', '2026-10-24 10:05:00'), ('a', 'pay', '2026-10-24 12:00:00'), ('b', 'visit', '2026-10-24 10:00:00'), ('b', 'other', '2026-10-24 10:00:30'), ('b', 'signup', '2026-10-24 10:01:00'), ('b', 'signup', '2026-10-24 10:02:00'), ('b', 'pay', '2026-10-24 10:02:00'), ('c', 'visit', '2026-10-24 09:00:00'), ('c', 'pay', '2026-10-24 09:00:00')`,
		],
		queries: [
			'SELECT toString(n) AS s, n FROM big ORDER BY n',
			'SELECT count(), a, b FROM pair GROUP BY a, b',
			'SELECT d, count() FROM dt GROUP BY d ORDER BY d',
			'SELECT o.number, (SELECT i.number FROM numbers(3) AS i WHERE i.number = o.number) AS n FROM numbers(3) AS o ORDER BY o.number',
			'SELECT o.number FROM numbers(4) AS o WHERE o.number IN (SELECT i.number FROM numbers(2) AS i WHERE i.number = o.number) ORDER BY o.number',
			'SELECT avgOrDefault(number), sumOrNull(number), countOrNull(number), maxOrDefault(number), avgOrNull(number), countOrNull() FROM numbers(0)',
			'SELECT sumOrNull(x), countOrNull(x), count(x), avgOrDefault(x), anyOrNull(x) FROM (SELECT CAST(NULL AS Nullable(Int32)) AS x)',
			'SELECT sum(x), avg(x), max(x), any(x), count(x), uniq(x), toTypeName(sum(x)), toTypeName(count(x)), toTypeName(uniq(x)), toTypeName(avgOrDefault(x)) FROM (SELECT CAST(NULL AS Nullable(Int32)) AS x)',
			'SELECT sum(x), avg(x), max(x), count(x), uniq(x), groupArray(x) FROM (SELECT arrayJoin([1, NULL, 3]) AS x)',
			"SELECT user, windowFunnel(3600)(at, step = 'visit', step = 'signup', step = 'pay') AS plain, windowFunnel(3600, 'strict_order')(at, step = 'visit', step = 'signup', step = 'pay') AS ordered, windowFunnel(3600, 'strict_deduplication')(at, step = 'visit', step = 'signup', step = 'pay') AS deduplicated, windowFunnel(3600, 'strict_increase')(at, step = 'visit', step = 'signup', step = 'pay') AS increasing, windowFunnel(3600, 'strict_once')(at, step = 'visit', step = 'signup', step = 'visit') AS once FROM steps GROUP BY user ORDER BY user",
			"SELECT k, count() FROM (SELECT ['a,sb'] AS k UNION ALL SELECT ['a', 'b']) GROUP BY k ORDER BY k",
			"SELECT a, b, count() FROM (SELECT 'x|y' AS a, 'z' AS b UNION ALL SELECT 'x' AS a, 'y|z' AS b) GROUP BY a, b ORDER BY a",
			'SELECT count() FROM (SELECT CAST(NULL AS Nullable(String)) AS k) AS l INNER JOIN (SELECT CAST(NULL AS Nullable(String)) AS k) AS r ON l.k = r.k',
			'SELECT count() FROM (SELECT CAST(NULL AS Nullable(String)) AS k) AS l INNER JOIN (SELECT CAST(NULL AS Nullable(String)) AS k) AS r USING k',
		],
	},
	{
		name: 'column moves',
		setup: ['CREATE TABLE ordered (a String, b String, c UInt8) ENGINE = MergeTree ORDER BY a'],
		queries: [
			'ALTER TABLE ordered MODIFY COLUMN c UInt8 FIRST',
			'ALTER TABLE ordered MODIFY COLUMN a String AFTER b',
			"SELECT name FROM system.columns WHERE table = 'ordered' ORDER BY position",
		],
	},
	{
		name: 'parameters',
		queries: [
			{
				sql: 'SELECT {a:String} AS a, {b:Array(String)} AS b, {d:DateTime64(3)} AS d, {n:Nullable(String)} AS n, {u:UInt8} AS u',
				params: { a: 'x\\ty', b: "['a','b\\'c']", d: '1792825200.123', n: '\\N', u: '7' },
			},
			{ sql: 'SELECT {a:String}, {u:UInt8}', params: { a: 'q', u: '5' } },
			{
				sql: 'SELECT number FROM numbers({n:UInt32}) WHERE number IN {set:Array(UInt8)}',
				params: { n: '10', set: '[2,4]' },
			},
			{ sql: 'SELECT {value:String} AS value', params: { value: "'); DROP TABLE x; --" } },
			{ sql: 'SELECT {missing:String}' },
		],
	},
	{
		name: 'formats',
		setup: EVENTS,
		queries: [
			'SELECT id, flags, score, externalId, createdAt FROM events ORDER BY id FORMAT TabSeparated',
			'SELECT id, flags, score, externalId FROM events ORDER BY id FORMAT TabSeparatedWithNames',
			'SELECT id, flags, score, externalId FROM events ORDER BY id FORMAT CSVWithNames',
			'SELECT id, score FROM events ORDER BY id FORMAT JSONCompactEachRow',
			'SELECT id, score FROM events ORDER BY id LIMIT 2 FORMAT JSONCompactEachRowWithNamesAndTypes',
			{
				sql: 'SELECT count() AS c, toUInt64(5) AS u FROM events',
				settings: { output_format_json_quote_64bit_integers: '1' },
			},
		],
	},
	{
		name: 'errors',
		setup: EVENTS,
		queries: [
			'SELECT * FROM missing',
			'SELECT nope FROM events',
			'SELECT nope(1)',
			'SELECT count(), id FROM events',
			'SELEC 1',
			'SELECT count() FROM events WHERE count() > 1',
			'CREATE TABLE events (id String) ENGINE = MergeTree ORDER BY id',
			"INSERT INTO events (id, nope) VALUES ('x', 1)",
			'SELECT 1; SELECT 2',
			"SELECT toDateTime('not a date')",
			'SELECT intDiv(1, 0)',
		],
	},
]

const run = async (endpoint: string, query: Case['queries'][number]) => {
	const { sql, params = {}, settings = {} } = typeof query === 'string' ? { sql: query } : query
	const url = new URL(endpoint)

	for (const [key, value] of Object.entries(params)) url.searchParams.set(`param_${key}`, value)
	for (const [key, value] of Object.entries(settings)) url.searchParams.set(key, value)

	const text = /\bFORMAT\s+\w+\s*$/i.test(sql) || !/^\s*(SELECT|WITH)/i.test(sql) ? sql : `${sql}\nFORMAT JSONEachRow`
	const response = await fetch(url, { method: 'POST', body: text })
	const body = await response.text()
	const code = response.headers.get('x-clickhouse-exception-code')

	if (code) {
		// Messages word things differently; the code & type are the contract.
		return `error ${code} ${body.match(/\(([A-Z_]+)\) \(version/)?.[1] ?? ''}`
	}

	return body
}

describe('ClickHouse conformance', () => {
	const memory = new ClickHouseServer()
	const real = realAvailable ? new ClickHouseServer({ engine: 'clickhouse' }) : undefined

	beforeAll(async () => {
		await Promise.all([memory.listen(), real?.listen()])
	})

	afterAll(async () => {
		await Promise.all([memory.close(), real?.close()])
	})

	for (const item of cases) {
		it(item.name, async () => {
			await memory.reset()
			await real?.reset()

			for (const statement of item.setup ?? []) {
				const answer = await run(memory.endpoint, statement)
				expect(answer, statement).not.toMatch(/^error/)
				if (real) expect(await run(real.endpoint, statement), statement).not.toMatch(/^error/)
			}

			const answers: string[] = []

			for (const query of item.queries) {
				const answer = await run(memory.endpoint, query)
				const label = typeof query === 'string' ? query : query.sql

				if (real) {
					expect(answer, label).toBe(await run(real.endpoint, query))
				}

				answers.push(`${label}\n${answer}`)
			}

			expect(answers.join('\n---\n')).toMatchSnapshot()
		})
	}
})
