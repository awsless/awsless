import { PostgresServer } from '@awsless/postgres-server'
import { applySchema, isPostgresFunction, postgres, postgresClient } from '../src'

const { integer, text, jsonb, array, nullable, table, nothing, boolean, date } = postgres.type

const double = postgres.function.define({
	name: 'double_of',
	args: { amount: integer() },
	returns: integer(),
	language: 'sql',
	attributes: 'IMMUTABLE',
	body: `SELECT amount * 2`,
})

// Uses double_of, which the module's order doesn't promise to be there first.
const bump = postgres.function.define({
	name: 'bump',
	args: { counter: text(), amount: nullable(integer()) },
	returns: integer(),
	language: 'plpgsql',
	body: `
		DECLARE
			result integer;
		BEGIN
			INSERT INTO counters AS c (name, value) VALUES (counter, double_of(coalesce(amount, 1)))
			ON CONFLICT (name) DO UPDATE SET value = c.value + excluded.value
			RETURNING value INTO result;

			RETURN result;
		END
	`,
})

// A day goes in & comes out as its text, alone, in an array and in a row.
const nextDay = postgres.function.define({
	name: 'next_day',
	args: { day: date() },
	returns: date(),
	language: 'sql',
	attributes: 'IMMUTABLE',
	body: `SELECT day + 1`,
})

const days = postgres.function.define({
	name: 'days_from',
	args: { day: date() },
	returns: table({ day: date(), others: array(date()), missing: nullable(date()) }),
	language: 'sql',
	attributes: 'IMMUTABLE',
	body: `SELECT day, ARRAY[day + 1, day + 2], NULL::date`,
})

const listCounters = postgres.function.define({
	name: 'list_counters',
	args: { names: array(text()), settings: jsonb<{ atLeast: number }>() },
	returns: table({ name: text(), value: integer(), is_big: boolean() }),
	language: 'sql',
	attributes: 'STABLE',
	body: `
		SELECT c.name, c.value::integer, c.value >= (settings->>'atLeast')::integer
		FROM counters c
		WHERE c.name = ANY (names)
		ORDER BY c.name
	`,
})

const clearCounters = postgres.function.define({
	name: 'clear_counters',
	args: {},
	returns: nothing(),
	language: 'sql',
	body: `DELETE FROM counters`,
})

describe('postgres.function.define', () => {
	const server = new PostgresServer()
	const definitions = [bump, listCounters, clearCounters, double, nextDay, days]
	let admin: ReturnType<typeof postgresClient>
	let client: ReturnType<typeof postgresClient>

	// As the CLI hands a module's functions over: each created without its
	// body checked, then again checked.
	const files = [
		{ name: 'function.ts', sql: 'SET LOCAL check_function_bodies = off' },
		...definitions.map(definition => ({ name: `function.ts (${definition.functionName})`, sql: definition.sql })),
		{ name: 'function.ts', sql: 'SET LOCAL check_function_bodies = on' },
		...definitions.map(definition => ({ name: `function.ts (${definition.functionName})`, sql: definition.sql })),
	]

	beforeAll(async () => {
		await server.listen()
		admin = postgresClient({ url: server.url })
		client = postgresClient({ url: server.url, schema: 'defined', strict: true })

		await applySchema(admin, {
			schema: 'defined',
			tables: {
				counters: { columns: { name: 'text', value: { type: 'bigint', default: '0' } }, primaryKey: ['name'] },
			},
			functions: files,
		})
	}, 60_000)

	afterAll(async () => {
		await client.close()
		await admin.close()
		await server.close()
	})

	it('marks its functions and writes their create statement', () => {
		expect(definitions.every(isPostgresFunction)).toBe(true)
		expect(isPostgresFunction(() => 1)).toBe(false)
		expect(bump.functionName).toBe('bump')
		expect(double.sql).toBe(
			[
				'CREATE OR REPLACE FUNCTION double_of(amount integer) RETURNS integer',
				'LANGUAGE sql IMMUTABLE AS $awsless$',
				'SELECT amount * 2',
				'$awsless$',
			].join('\n')
		)
	})

	it('calls a function by its named arguments and answers its value', async () => {
		expect(await bump(client, { counter: 'visits', amount: 2 })).toBe(4)
		// A null argument travels as NULL.
		expect(await bump(client, { counter: 'visits', amount: null })).toBe(6)
		expect(await double(client, { amount: 21 })).toBe(42)
	})

	it('answers the rows of a table, sends json as json and nothing for void', async () => {
		await bump(client, { counter: 'logins', amount: 1 })

		expect(
			await listCounters(client, { names: ['logins', 'visits', 'missing'], settings: { atLeast: 5 } })
		).toStrictEqual([
			{ name: 'logins', value: 2, is_big: false },
			{ name: 'visits', value: 6, is_big: true },
		])
		expect(await clearCounters(client)).toBeUndefined()
		expect(await listCounters(client, { names: ['visits'], settings: { atLeast: 0 } })).toStrictEqual([])
	})

	it('answers a day as the text it was given as', async () => {
		const day: string = await nextDay(client, { day: '2026-12-31' })

		expect(day).toBe('2027-01-01')
		expect(await days(client, { day: '2026-02-28' })).toEqual([
			{ day: '2026-02-28', others: ['2026-03-01', '2026-03-02'], missing: null },
		])
	})

	it('refuses a name that is not plain sql and a body that holds its quote', () => {
		const definition = { args: {}, returns: nothing(), language: 'sql' as const, body: 'SELECT 1' }

		expect(() => postgres.function.define({ ...definition, name: 'drop table' })).toThrow(TypeError)
		expect(() =>
			postgres.function.define({ ...definition, name: 'fine', body: 'SELECT $awsless$x$awsless$' })
		).toThrow(TypeError)
	})

	it('fails the apply on a body that does not hold, at its function', async () => {
		const broken = postgres.function.define({
			name: 'broken',
			args: {},
			returns: integer(),
			language: 'sql',
			body: `SELECT missing_column FROM counters`,
		})

		await expect(
			applySchema(admin, {
				schema: 'defined_broken',
				tables: { counters: { columns: { name: 'text' }, primaryKey: ['name'] } },
				functions: [
					{ name: 'function.ts', sql: 'SET LOCAL check_function_bodies = off' },
					{ name: 'function.ts (broken)', sql: broken.sql },
					{ name: 'function.ts', sql: 'SET LOCAL check_function_bodies = on' },
					{ name: 'function.ts (broken)', sql: broken.sql },
				],
			})
		).rejects.toThrow(/function\.ts \(broken\)/)
	})
})
