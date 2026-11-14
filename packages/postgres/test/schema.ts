import { PostgresServer } from '@awsless/postgres-server'
import { applySchema, getSqlState, postgresClient, TableChangeError, type TableDefinition } from '../src'

const links: TableDefinition = {
	columns: {
		id: { type: 'bigint', identity: true },
		project_id: 'uuid',
		external_id: { type: 'text', collate: 'C' },
		happened_at: 'timestamptz?',
		event_days: { type: 'datemultirange', default: "'{}'" },
		weight: 'double precision?',
	},
	primaryKey: ['project_id', 'external_id'],
	indexes: {
		happened: ['project_id', 'happened_at'],
		id: { columns: ['project_id', 'id'], unique: true },
	},
	partitionBy: { hash: ['project_id'], partitions: 4 },
	fillfactor: 85,
}

const counters: TableDefinition = {
	columns: { name: 'text', value: { type: 'bigint', default: '0' } },
	primaryKey: ['name'],
	indexes: { value: ['value'] },
}

const functions = {
	name: 'function.sql',
	sql: `
		CREATE FUNCTION bump(counter text, amount bigint DEFAULT 1) RETURNS bigint LANGUAGE plpgsql AS $$
		DECLARE
			result bigint;
		BEGIN
			INSERT INTO counters AS c (name, value) VALUES (counter, amount)
			ON CONFLICT (name) DO UPDATE SET value = c.value + amount
			RETURNING value INTO result;

			RETURN result;
		END $$;
	`,
}

const project = '6f1c1f0e-3b7a-4c58-9d55-0f1f2a3b4c5d'

describe('applySchema', () => {
	const server = new PostgresServer()
	let admin: ReturnType<typeof postgresClient>
	let number = 0

	// A schema of its own per test, with a client that queries in it.
	const fresh = () => {
		const schema = `test_${++number}`
		const client = postgresClient({ url: server.url, schema })

		return {
			schema,
			client,
			apply: (
				tables: Record<string, TableDefinition>,
				files: { name: string; sql: string }[] = [],
				options?: Parameters<typeof applySchema>[2]
			) => applySchema(admin, { schema, tables, functions: files }, options),
		}
	}

	// When Postgres last wrote the catalog rows of a schema's tables, columns,
	// indexes & comments: the same after an apply that changed nothing.
	const catalog = async (schema: string) => {
		return admin.query(
			`SELECT 'class' AS kind, c.relname AS name, c.xmin::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1
			UNION ALL SELECT 'attribute', c.relname || '.' || a.attname, a.xmin::text FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1
			UNION ALL SELECT 'comment', c.relname, d.xmin::text FROM pg_description d JOIN pg_class c ON c.oid = d.objoid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1
			ORDER BY 1, 2`,
			[schema]
		)
	}

	const columnsOf = async (schema: string, table: string) => {
		const rows = await admin.query<{ name: string; type: string; nullable: boolean; fallback: string | null }>(
			`SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS fallback
			FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
			WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum`,
			[`${schema}.${table}`]
		)

		return Object.fromEntries(rows.map(({ name, ...column }) => [name, column]))
	}

	const indexesOf = async (schema: string, table: string) => {
		const rows = await admin.query<{ name: string }>(
			'SELECT indexname AS name FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 ORDER BY 1',
			[schema, table]
		)

		return rows.map(row => row.name)
	}

	beforeAll(async () => {
		await server.listen()
		admin = postgresClient({ url: server.url })
	})

	afterAll(async () => {
		await admin.close()
		await server.close()
	})

	it('creates the declared tables: columns, keys, indexes & fillfactor', async () => {
		const { schema, client, apply } = fresh()

		await apply({ counters, links })

		expect(await columnsOf(schema, 'links')).toEqual({
			id: { type: 'bigint', nullable: false, fallback: null },
			project_id: { type: 'uuid', nullable: false, fallback: null },
			external_id: { type: 'text', nullable: false, fallback: null },
			happened_at: { type: 'timestamp with time zone', nullable: true, fallback: null },
			event_days: { type: 'datemultirange', nullable: false, fallback: "'{}'::datemultirange" },
			weight: { type: 'double precision', nullable: true, fallback: null },
		})
		expect(await indexesOf(schema, 'links')).toEqual(['links_happened', 'links_id', 'links_pkey'])
		expect(await indexesOf(schema, 'counters')).toEqual(['counters_pkey', 'counters_value'])

		// Text with the C collation sorts by bytes: capitals first.
		await client.query('INSERT INTO links (project_id, external_id) VALUES ($1, $2), ($1, $3)', [project, 'b', 'B'])

		expect(
			await client.query('SELECT id::int, external_id, event_days, weight FROM links ORDER BY external_id')
		).toEqual([
			{ id: 2, external_id: 'B', event_days: '{}', weight: null },
			{ id: 1, external_id: 'b', event_days: '{}', weight: null },
		])

		// The primary key, a unique index & NOT NULL hold.
		const failed = async (sql: string, params: unknown[]) =>
			getSqlState(await client.query(sql, params).catch(error => error))

		expect(await failed('INSERT INTO links (project_id, external_id) VALUES ($1, $2)', [project, 'b'])).toBe(
			'23505'
		)
		expect(await failed('INSERT INTO links (project_id, external_id) VALUES ($1, NULL)', [project])).toBe('23502')
		expect(await failed('INSERT INTO links (id, project_id, external_id) VALUES (9, $1, $2)', [project, 'c'])).toBe(
			'428C9'
		)

		await client.close()
	})

	it('spreads the rows of a partitioned table over its partitions & finds them again', async () => {
		const { schema, client, apply } = fresh()

		await apply({ links })

		await client.query(
			"INSERT INTO links (project_id, external_id) SELECT md5(i::text)::uuid, 'user-' || i FROM generate_series(1, 200) i"
		)

		const partitions = await client.query<{ partition: string; rows: number }>(
			'SELECT tableoid::regclass::text AS partition, count(*)::int AS rows FROM links GROUP BY 1 ORDER BY 1'
		)

		expect(partitions.map(row => row.partition)).toEqual(['links_p0', 'links_p1', 'links_p2', 'links_p3'])
		expect(partitions.reduce((total, row) => total + row.rows, 0)).toBe(200)

		// A read by the partition key only opens the one partition that holds it.
		expect(
			await client.query(
				"SELECT external_id FROM links WHERE project_id = md5('42')::uuid AND external_id = 'user-42'"
			)
		).toEqual([{ external_id: 'user-42' }])

		const [plan] = await client.query<{ 'QUERY PLAN': string }>(
			"EXPLAIN (FORMAT JSON) SELECT * FROM links WHERE project_id = md5('42')::uuid"
		)

		expect(new Set(JSON.stringify(plan).match(/links_p\d/g)).size).toBe(1)

		// Each partition has the fillfactor, the table itself has no pages.
		expect(
			await admin.query(
				'SELECT c.relname AS name, c.reloptions AS options FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relkind IN ($2, $3) ORDER BY 1',
				[schema, 'r', 'p']
			)
		).toEqual([
			{ name: 'links', options: null },
			{ name: 'links_p0', options: ['fillfactor=85'] },
			{ name: 'links_p1', options: ['fillfactor=85'] },
			{ name: 'links_p2', options: ['fillfactor=85'] },
			{ name: 'links_p3', options: ['fillfactor=85'] },
		])

		await client.close()
	})

	it('changes nothing when applied again', async () => {
		const { schema, apply } = fresh()

		await apply({ counters, links }, [functions])

		const before = await catalog(schema)

		await apply({ counters, links }, [functions])
		await apply({ links, counters }, [functions])

		expect(before.length).toBeGreaterThan(40)
		expect(await catalog(schema)).toEqual(before)
	})

	it('adds & drops columns, changes defaults & nullability, and keeps the rows', async () => {
		for (const partitionBy of [undefined, links.partitionBy]) {
			const { schema, client, apply } = fresh()
			const table = { ...links, partitionBy }

			await apply({ links: table })
			await client.query('INSERT INTO links (project_id, external_id, weight) VALUES ($1, $2, 0.5)', [
				project,
				'a',
			])

			const { weight: _, ...rest } = links.columns

			await apply({
				links: {
					...table,
					columns: {
						...rest,
						// New, with a default for the rows already there.
						count: { type: 'integer', default: '7' },
						note: 'text?',
						// Another default, and none.
						event_days: 'datemultirange',
						// NULL allowed & refused.
						project_id: 'uuid',
						happened_at: { type: 'timestamptz?', default: "'2026-01-01Z'" },
					},
				},
			})

			expect(await columnsOf(schema, 'links')).toEqual({
				id: { type: 'bigint', nullable: false, fallback: null },
				project_id: { type: 'uuid', nullable: false, fallback: null },
				external_id: { type: 'text', nullable: false, fallback: null },
				happened_at: {
					type: 'timestamp with time zone',
					nullable: true,
					fallback: "'2026-01-01 00:00:00+00'::timestamp with time zone",
				},
				event_days: { type: 'datemultirange', nullable: false, fallback: null },
				count: { type: 'integer', nullable: false, fallback: '7' },
				note: { type: 'text', nullable: true, fallback: null },
			})
			expect(await client.query('SELECT id::int, external_id, count, note FROM links')).toEqual([
				{ id: 1, external_id: 'a', count: 7, note: null },
			])

			// A column made NOT NULL, and nullable again.
			await client.query("UPDATE links SET note = 'filled'")
			await apply({
				links: {
					...table,
					columns: { ...rest, note: 'text', project_id: 'uuid', happened_at: 'timestamptz?' },
				},
			})

			expect((await columnsOf(schema, 'links')).note).toEqual({ type: 'text', nullable: false, fallback: null })

			await apply({ links: { ...table, columns: { ...rest, note: 'text?' } } })

			expect((await columnsOf(schema, 'links')).note!.nullable).toBe(true)
			expect(await client.query('SELECT note FROM links')).toEqual([{ note: 'filled' }])

			await client.close()
		}
	})

	it('adds, drops & replaces indexes and changes the fillfactor', async () => {
		const { schema, client, apply } = fresh()
		const options = async (table: string) => {
			const [row] = await admin.query<{ options: string[] | null }>(
				'SELECT reloptions AS options FROM pg_class WHERE oid = $1::regclass',
				[`${schema}.${table}`]
			)

			return row!.options
		}

		await apply({ counters, links })
		await client.query("INSERT INTO counters VALUES ('a', 1), ('b', 1)")

		await apply({
			counters: { ...counters, indexes: { name_value: ['name', 'value'] }, fillfactor: 70 },
			links: { ...links, indexes: { ...links.indexes, weight: ['project_id', 'weight'] }, fillfactor: 60 },
		})

		expect(await indexesOf(schema, 'counters')).toEqual(['counters_name_value', 'counters_pkey'])
		expect(await indexesOf(schema, 'links')).toEqual(['links_happened', 'links_id', 'links_pkey', 'links_weight'])
		expect(await options('counters')).toEqual(['fillfactor=70'])
		expect(await options('links_p3')).toEqual(['fillfactor=60'])

		// The same name with other columns, now unique: rows that share a value refuse it.
		const unique = { ...counters, indexes: { name_value: { columns: ['value'], unique: true } } }

		await expect(apply({ counters: unique, links })).rejects.toThrow(
			'Postgres table "counters": could not create unique index'
		)

		await client.query("UPDATE counters SET value = 2 WHERE name = 'b'")
		await apply({ counters: unique, links })

		expect(await options('counters')).toBeNull()
		expect(getSqlState(await client.query("INSERT INTO counters VALUES ('c', 2)").catch(error => error))).toBe(
			'23505'
		)

		await client.close()
	})

	it('refuses a change that would rewrite the rows & leaves everything as it was', async () => {
		const { schema, client, apply } = fresh()

		await apply({ counters, links })
		await client.query("INSERT INTO counters VALUES ('kept', 1)")

		const before = await catalog(schema)
		const refused = async (table: TableDefinition) => {
			// Another table changes in the same apply, before the refused one.
			return apply({ counters: { ...counters, fillfactor: 50 }, links: table }).catch(error => error)
		}

		for (const [table, what] of [
			[{ ...links, primaryKey: ['project_id', 'external_id', 'id'] }, 'primary key'],
			[
				{ ...links, columns: { ...links.columns, weight: 'integer?' } },
				'type of column "weight" (double precision to integer)',
			],
			[{ ...links, columns: { ...links.columns, external_id: 'text' } }, 'collation of column "external_id"'],
			[{ ...links, columns: { ...links.columns, id: 'bigint' } }, 'identity of column "id"'],
			[{ ...links, partitionBy: { hash: ['project_id'], partitions: 8 } }, 'partitioning'],
			[{ ...links, partitionBy: undefined }, 'partitioning'],
		] as const) {
			const error = await refused(table as TableDefinition)

			expect(error).toBeInstanceOf(TableChangeError)
			expect(error.message).toBe(
				`The ${what} of Postgres table "links" can't change in place. Declare a new table & copy the data over instead.`
			)
		}

		expect(await catalog(schema)).toEqual(before)
		expect(await client.query('SELECT name FROM counters')).toEqual([{ name: 'kept' }])

		await client.close()
	})

	it('recreates a table whose change is refused, when local data can go', async () => {
		const { schema, client, apply } = fresh()

		await apply({ counters, links })
		await client.query("INSERT INTO counters VALUES ('kept', 1)")
		await client.query('INSERT INTO links (project_id, external_id) VALUES ($1, $2)', [project, 'gone'])

		const plain = {
			...links,
			partitionBy: undefined,
			primaryKey: ['external_id'],
			columns: { ...links.columns, id: 'bigint' },
		}

		await apply({ counters, links: plain }, [], { recreate: true })

		// The refused table is new & empty, the other one kept its rows.
		expect(await client.query('SELECT * FROM links')).toEqual([])
		expect(await indexesOf(schema, 'links')).toEqual(['links_happened', 'links_id', 'links_pkey'])
		expect(
			await admin.query(
				"SELECT count(*)::int AS partitions FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname LIKE 'links_p_'",
				[schema]
			)
		).toEqual([{ partitions: 0 }])
		expect(await client.query('SELECT name FROM counters')).toEqual([{ name: 'kept' }])

		// A change that can happen in place still does, with the option on.
		await client.query("INSERT INTO links (id, project_id, external_id) VALUES (1, $1, 'stays')", [project])
		await apply({ counters, links: { ...plain, fillfactor: 50 } }, [], { recreate: true })

		expect(await client.query('SELECT external_id FROM links')).toEqual([{ external_id: 'stays' }])

		await client.close()
	})

	it('drops a table that left the declaration, unless the app retains its data', async () => {
		const { schema, client, apply } = fresh()
		const tables = async () => {
			const rows = await admin.query<{ name: string }>(
				'SELECT tablename AS name FROM pg_tables WHERE schemaname = $1 ORDER BY 1',
				[schema]
			)

			return rows.map(row => row.name)
		}

		await apply({ counters, links })
		await client.query('CREATE TABLE by_hand (id int)')

		await apply({ counters }, [], { retain: true })

		expect(await tables()).toEqual(['by_hand', 'counters', 'links', 'links_p0', 'links_p1', 'links_p2', 'links_p3'])

		await apply({ counters })

		// The partitions go with their table. A table awsless didn't make stays.
		expect(await tables()).toEqual(['by_hand', 'counters'])

		await client.close()
	})

	it('refuses to take over a table it did not make, or replaces it when local data can go', async () => {
		const { client, apply } = fresh()

		await apply({})
		await client.query(
			"CREATE TABLE counters (name text PRIMARY KEY, value bigint); INSERT INTO counters VALUES ('old', 1)"
		)

		const error = await apply({ counters }).catch(error => error)

		expect(error).toBeInstanceOf(TableChangeError)
		expect(error.message).toBe(
			'Postgres table "counters" exists but wasn\'t made by awsless. Drop or rename it, then apply again.'
		)
		expect(await client.query('SELECT name FROM counters')).toEqual([{ name: 'old' }])

		await apply({ counters }, [], { recreate: true })

		expect(await client.query('SELECT name FROM counters')).toEqual([])

		// From here it is a table like any other.
		await apply({ counters: { ...counters, fillfactor: 80 } })

		await client.close()
	})

	it('names the table of a change Postgres refuses & rolls the whole apply back', async () => {
		const { schema, client, apply } = fresh()

		await apply({ counters })
		await client.query("INSERT INTO counters VALUES ('a', 1)")

		const before = await catalog(schema)
		const error = await apply({
			links,
			counters: { ...counters, columns: { ...counters.columns, owner: 'text' } },
		}).catch(error => error)

		expect(error.message).toBe(
			'Postgres table "counters": column "owner" of relation "counters" contains null values'
		)
		expect(getSqlState(error)).toBe('23502')

		// The table created before the one that failed is gone again.
		expect(await catalog(schema)).toEqual(before)
		expect(await admin.query('SELECT 1 AS one')).toEqual([{ one: 1 }])

		await client.close()
	})

	it('starts from an empty schema when asked to reset', async () => {
		const { client, apply } = fresh()

		await apply({ counters }, [functions])
		await client.query("SELECT bump('gone')")
		await apply({ counters }, [functions], { reset: true })

		expect(await client.query('SELECT name FROM counters')).toEqual([])
		expect(await client.query("SELECT bump('new')::int AS value")).toEqual([{ value: 1 }])

		await client.close()
	})

	it('runs the function files after the tables, in order', async () => {
		const { client, apply } = fresh()
		// Postgres checks this body when the function is made, so the table has to be there.
		const total = {
			name: 'total.sql',
			sql: 'CREATE FUNCTION total() RETURNS bigint LANGUAGE sql BEGIN ATOMIC SELECT coalesce(sum(value), 0)::bigint FROM counters; END;',
		}
		const twice = {
			name: 'twice.sql',
			sql: 'CREATE FUNCTION twice() RETURNS bigint LANGUAGE sql AS $$ SELECT total() * 2 $$;',
		}

		await apply({ counters }, [functions, total, twice])

		expect(await client.query("SELECT bump('visits', 4)::int AS value, twice()::int AS twice")).toEqual([
			{ value: 4, twice: 8 },
		])

		// The client that applied it keeps its own search path.
		await expect(admin.query('SELECT * FROM counters')).rejects.toThrow('relation "counters" does not exist')

		await client.close()
	})

	it('creates the functions again: changed, with a new signature, or gone', async () => {
		const { client, apply } = fresh()
		const changed = {
			name: 'function.sql',
			sql: `
				CREATE FUNCTION bump(counter text) RETURNS text LANGUAGE sql AS $$ SELECT 'changed ' || counter $$;
				CREATE PROCEDURE reset() LANGUAGE sql AS $$ DELETE FROM counters $$;
				CREATE AGGREGATE total(bigint) (SFUNC = int8pl, STYPE = bigint);
			`,
		}

		await apply({ counters }, [functions])
		await client.query("SELECT bump('visits', 5)")
		await apply({ counters }, [changed])

		expect(await client.query('SELECT bump($1) AS value', ['visits'])).toEqual([{ value: 'changed visits' }])
		// The two-argument bump left the files, so it left the schema.
		await expect(client.query('SELECT bump($1, $2)', ['visits', 4])).rejects.toThrow('does not exist')

		// Procedures & aggregates are recreated like functions.
		await apply({ counters }, [changed])

		expect(await client.query('SELECT total(value)::int AS total FROM counters')).toEqual([{ total: 5 }])

		await apply({ counters })

		await expect(client.query('SELECT bump($1)', ['visits'])).rejects.toThrow('does not exist')
		expect(await client.query('SELECT value::int FROM counters')).toEqual([{ value: 5 }])

		await client.close()
	})

	it('names the file & line that failed and leaves the schema as it was', async () => {
		const { schema, client, apply } = fresh()

		await apply({ counters }, [functions])

		const before = await catalog(schema)
		const broken = {
			name: 'src/util/sql/function.sql',
			sql: `CREATE FUNCTION one() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;\n\nCREATE FUNCTION bump() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;\nSELEC 1;`,
		}

		const error = await apply({ counters: { ...counters, fillfactor: 50 }, links }, [broken]).catch(error => error)

		expect(error.message).toBe('src/util/sql/function.sql:4: syntax error at or near "SELEC"')
		expect(getSqlState(error)).toBe('42601')

		// The tables are as they were & the old function is still there.
		expect(await catalog(schema)).toEqual(before)
		expect(await client.query('SELECT bump($1)::int AS value', ['kept'])).toEqual([{ value: 1 }])

		await client.close()
	})

	it('keeps a function that a trigger still needs', async () => {
		const { client, apply } = fresh()
		const triggers = {
			name: 'function.sql',
			sql: `
				CREATE OR REPLACE FUNCTION touch() RETURNS trigger LANGUAGE plpgsql AS $$
				BEGIN
					NEW.value := NEW.value + 100;
					RETURN NEW;
				END $$;

				CREATE OR REPLACE TRIGGER touch BEFORE INSERT ON counters FOR EACH ROW EXECUTE FUNCTION touch();
			`,
		}

		await apply({ counters }, [triggers])
		await apply({ counters }, [triggers])

		expect(await client.query("INSERT INTO counters VALUES ('a', 1) RETURNING value::int")).toEqual([
			{ value: 101 },
		])

		await client.close()
	})

	it('applies many schemas at once, sharing an extension in public', async () => {
		const search = {
			name: 'function.sql',
			sql: `
				CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;
				CREATE FUNCTION alike(a text, b text) RETURNS boolean LANGUAGE sql AS $$ SELECT a % b AND similarity(a, b) > 0.3 $$;
			`,
		}

		const schemas = Array.from({ length: 8 }, () => fresh())

		await Promise.all(schemas.map(({ apply }) => apply({ counters, links }, [search])))

		// The function & the operator of the extension resolve without a schema.
		for (const { client } of schemas) {
			expect(await client.query("SELECT alike('postgres', 'postgers') AS alike")).toEqual([{ alike: true }])
			await client.close()
		}
	})

	it('refuses a schema name it would have to quote', async () => {
		await expect(applySchema(admin, { schema: 'Bad-Name' })).rejects.toThrow(TypeError)
	})

	it('only takes a client made by postgresClient', async () => {
		const fake = { query: async () => [], close: async () => {} }

		await expect(applySchema(fake, { schema: 'app' })).rejects.toThrow(TypeError)
	})
})
