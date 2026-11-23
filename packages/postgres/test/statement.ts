import { renderQuery, splitStatements } from '../src/statement'

describe('splitStatements', () => {
	const split = (sql: string) => splitStatements(sql).map(statement => statement.sql)

	it('tells statements apart by their semicolons', () => {
		expect(split('SELECT 1; SELECT 2;\n\nSELECT 3')).toEqual(['SELECT 1', 'SELECT 2', 'SELECT 3'])
		expect(split('SELECT 1')).toEqual(['SELECT 1'])
		expect(split('  \n ; ;; SELECT 1 ;; ')).toEqual(['SELECT 1'])
		expect(split('')).toEqual([])
	})

	it('leaves semicolons in strings, quoted names, bodies & comments alone', () => {
		expect(split(`SELECT 'a;b', 'it''s; fine', E'a\\';b', "a;""b" FROM t; SELECT 2`)).toEqual([
			`SELECT 'a;b', 'it''s; fine', E'a\\';b', "a;""b" FROM t`,
			'SELECT 2',
		])
		expect(split('SELECT 1 -- one; still a comment\n; SELECT /* two; /* nested; */ still; */ 2;')).toEqual([
			'SELECT 1 -- one; still a comment',
			'SELECT /* two; /* nested; */ still; */ 2',
		])

		const body = `CREATE FUNCTION bump(counter text) RETURNS bigint LANGUAGE plpgsql AS $$
			DECLARE result bigint := 0;
			BEGIN
				result := result + 1; -- $1 is not a placeholder here
				RETURN result;
			END $$`
		const tagged = `DO $do$ BEGIN PERFORM 1; PERFORM $$nested; text$$; END $do$`

		expect(split(`${body};\n${tagged};`)).toEqual([body, tagged])
	})

	it('keeps a BEGIN ATOMIC body with its statement', () => {
		const atomic = `CREATE OR REPLACE FUNCTION total() RETURNS bigint LANGUAGE sql BEGIN ATOMIC
			SELECT 1;
			SELECT CASE WHEN true THEN 2 ELSE 3 END;
		END`
		const procedure = 'CREATE PROCEDURE reset() BEGIN ATOMIC DELETE FROM counters; END'

		expect(split(`${atomic};\n${procedure}; SELECT 1;`)).toEqual([atomic, procedure, 'SELECT 1'])
		// Only a function or procedure has such a body.
		expect(split('BEGIN; SELECT 1; END;')).toEqual(['BEGIN', 'SELECT 1', 'END'])
	})

	it('drops what is only a comment & knows the line a statement starts on', () => {
		expect(splitStatements('-- A file of functions.\n\nSELECT 1;\n\n/* two */\n  SELECT 2;\n-- the end\n')).toEqual(
			[
				{ sql: '-- A file of functions.\n\nSELECT 1', line: 1 },
				{ sql: '/* two */\n  SELECT 2', line: 5 },
			]
		)
	})
})

describe('renderQuery', () => {
	it('writes a value in as a literal, typed by its place like an untyped parameter', () => {
		expect(
			renderQuery('SELECT * FROM links WHERE project_id = $1 AND weight > $2 AND kept = $3', ['6f1c', 1.5, true])
		).toEqual({
			sql: "SELECT * FROM links WHERE project_id = '6f1c' AND weight > '1.5' AND kept = 'true'",
			parameters: [],
		})
		expect(renderQuery('SELECT $1, $2', [null, undefined])).toEqual({ sql: 'SELECT NULL, NULL', parameters: [] })
	})

	it('escapes what a value holds', () => {
		expect(renderQuery('SELECT $1', ["it's; DROP TABLE links; --"]).sql).toBe(
			"SELECT 'it''s; DROP TABLE links; --'"
		)
		expect(renderQuery('SELECT $1', ["back\\slash \\' quote"]).sql).toBe("SELECT  E'back\\\\slash \\\\'' quote'")
		expect(renderQuery('SELECT $1', ['$1 :name $$']).sql).toBe("SELECT '$1 :name $$'")
	})

	it('writes dates, arrays, objects & bytes the way pg sends them', () => {
		const { sql } = renderQuery('SELECT $1, $2, $3, $4', [
			['a', 'b "c"', null],
			[1, 2],
			{ a: "it's" },
			Buffer.from('hi'),
		])

		expect(sql).toBe(`SELECT  E'{"a","b \\\\"c\\\\"",NULL}', '{"1","2"}', '{"a":"it''s"}',  E'\\\\x6869'`)

		// A date goes as the moment it is, written in this process's time zone.
		const date = new Date('2026-11-13T10:00:00.123Z')
		const literal = renderQuery('SELECT $1', [date]).sql.slice('SELECT '.length)

		expect(literal).toMatch(/^'2026-11-1\dT\d\d:\d\d:00\.123[+-]\d\d:\d\d'$/)
		expect(new Date(literal.slice(1, -1))).toEqual(date)
	})

	it('sends a value that the sql casts next to the sql, as text', () => {
		expect(
			renderQuery(
				'SELECT link($1, $2::jsonb, $3 :: text[], $4::bigint[]) WHERE at > $5::timestamptz AND id = $1',
				['6f1c', JSON.stringify([{ a: 1 }]), ['a', 'b'], [1, 2], new Date('2026-11-13T10:00:00Z')]
			)
		).toEqual({
			sql: "SELECT link('6f1c', :p2::jsonb, :p3 :: text[], :p4::bigint[]) WHERE at > :p5::timestamptz AND id = '6f1c'",
			parameters: [
				{ name: 'p2', value: '[{"a":1}]' },
				{ name: 'p3', value: '{"a","b"}' },
				{ name: 'p4', value: '{"1","2"}' },
				{ name: 'p5', value: expect.stringMatching(/^2026-11-13T\d\d:00:00\.000[+-]\d\d:\d\d$/) },
			],
		})
		expect(renderQuery('SELECT $1::jsonb', [null])).toEqual({ sql: 'SELECT NULL::jsonb', parameters: [] })
	})

	it('leaves what only looks like a placeholder alone', () => {
		const sql = `SELECT '$1', "$1", $tag$ $1 $tag$, a$1 -- $1\n/* $1 */ FROM t WHERE id = $1`

		expect(renderQuery(sql, [7]).sql).toBe(
			`SELECT '$1', "$1", $tag$ $1 $tag$, a$1 -- $1\n/* $1 */ FROM t WHERE id = '7'`
		)
	})

	it('wants the parameters to match the placeholders, like Postgres', () => {
		expect(() => renderQuery('SELECT $1, $2', [1])).toThrow('2 placeholders, up to $2, but 1 parameters were given')
		expect(() => renderQuery('SELECT $1', [1, 2])).toThrow('1 placeholders, up to $1, but 2 parameters were given')
		expect(() => renderQuery('SELECT 1', [1])).toThrow(TypeError)
		expect(renderQuery('SELECT $2, $1, $2', ['a', 'b']).sql).toBe("SELECT 'b', 'a', 'b'")
	})

	it('takes one statement', () => {
		expect(() => renderQuery('SELECT 1; SELECT 2')).toThrow('A query is one statement')
		expect(renderQuery('SELECT 1;').sql).toBe('SELECT 1;')
		expect(renderQuery("SELECT ';'; -- done").sql).toBe("SELECT ';'; -- done")
	})

	it('refuses a query the Data API has no room for & says how to make room', () => {
		const big = 'x'.repeat(70_000)

		expect(() => renderQuery('SELECT $1', [big])).toThrow(
			'The query is 70009 characters with its values written in, over the 65536 the Data API takes. Cast a big value in the sql'
		)
		expect(renderQuery('SELECT $1::text', [big]).parameters[0]!.value).toHaveLength(70_000)
		expect(() => renderQuery('SELECT $1::text', ['x'.repeat(5 * 1024 * 1024)])).toThrow(
			'over the 4194304 the Data API takes in one request'
		)
	})
})
