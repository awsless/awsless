import { splitStatements } from './statement'
import {
	alterDeclaredTable,
	createTableStatements,
	declareTable,
	parseTableComment,
	TableChangeError,
	type TableDefinition,
} from './table'
import { assertIdentifier, type PostgresClient, PostgresError, type Session, transact } from './transport'

export type SqlFile = {
	// Shown in the error when its sql fails, like its path.
	name: string
	sql: string
}

export type SchemaDefinition = {
	schema: string
	tables?: Record<string, TableDefinition>
	// Files of functions, run in order after the tables are there.
	functions?: SqlFile[]
}

export type ApplySchemaOptions = {
	// Starts from an empty schema, for data that can go.
	reset?: boolean
	// Drops & creates a table whose change can't happen in place, for
	// data that can go. Without it such a change is an error.
	recreate?: boolean
	// Keeps a table that left the declaration, for an app that retains
	// its data. Without it the table is dropped.
	retain?: boolean
}

// Functions hold no data, so they go & the files create them again: one
// that left the files is gone, and one with a new signature has no old
// twin. A function that a trigger, index or extension still needs stays,
// for CREATE OR REPLACE in the files to change in place.
const dropRoutines = (schema: string) => `
DO $awsless$
DECLARE
	routine regprocedure;
BEGIN
	FOR routine IN
		SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = '${schema}'
	LOOP
		BEGIN
			EXECUTE format('DROP ROUTINE %s', routine);
		EXCEPTION WHEN dependent_objects_still_exist THEN
			NULL;
		END;
	END LOOP;
END
$awsless$`

// The tables of a schema with their comments, partitions left out.
const liveTables = (schema: string) => `
SELECT c.relname::text AS name, d.description AS comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_description d ON d.objoid = c.oid AND d.classoid = 'pg_class'::regclass AND d.objsubid = 0
WHERE n.nspname = '${schema}' AND c.relkind IN ('r', 'p') AND NOT c.relispartition`

// Postgres counts characters from 1 to where a statement went wrong.
const lineOf = (sql: string, position: string | undefined) => {
	const offset = Number(position)

	return offset > 0 ? sql.slice(0, offset - 1).split('\n').length : 1
}

// Says which table or file a statement that Postgres refused belongs to.
const runNamed = async (session: Session, sql: string, name: (error: PostgresError) => string) => {
	try {
		return await session.query(sql)
	} catch (error) {
		if (error instanceof PostgresError) {
			error.message = `${name(error)}: ${error.message}`
		}

		throw error
	}
}

const applyTables = async (
	session: Session,
	schema: string,
	tables: Record<string, TableDefinition>,
	options: ApplySchemaOptions
) => {
	const live = new Map(
		(await session.query(liveTables(schema))).map(table => [table.name as string, table.comment as string | null])
	)

	const run = async (table: string, statements: string[]) => {
		for (const statement of statements) {
			await runNamed(session, statement, () => `Postgres table "${table}"`)
		}
	}

	for (const [name, definition] of Object.entries(tables)) {
		const next = declareTable(definition)

		if (!live.has(name)) {
			await run(name, createTableStatements(name, next))
			continue
		}

		try {
			const prior = parseTableComment(live.get(name))

			// Without the definition it was made with, there's nothing to
			// tell what a change would do to its rows.
			if (!prior) {
				throw new TableChangeError(
					`Postgres table "${name}" exists but wasn't made by awsless. Drop or rename it, then apply again.`
				)
			}

			await run(name, alterDeclaredTable(name, prior, next))
		} catch (error) {
			if (!options.recreate || !(error instanceof TableChangeError)) {
				throw error
			}

			await run(name, [`DROP TABLE "${assertIdentifier(name)}" CASCADE`, ...createTableStatements(name, next)])
		}
	}

	// Only tables awsless made: one made by hand in the schema stays.
	for (const [name, comment] of live) {
		if (!Object.hasOwn(tables, name) && !options.retain && parseTableComment(comment)) {
			await run(name, [`DROP TABLE "${assertIdentifier(name)}" CASCADE`])
		}
	}
}

// How long the schema's apply waits for a lock on a table the app is using.
const APPLY_LOCK_TIMEOUT = '10s'

// Brings a schema up to its declaration: creates the schema when missing,
// creates or alters every declared table, drops the tables that left,
// then runs the function files in order as written. The schema is the
// search path, before public. Everything happens in one transaction, so
// a change that fails leaves the schema as it was. Every statement goes
// on its own, whichever way the client reaches Postgres: over a
// connection or through the Data API, which takes one a call.
export const applySchema = (client: PostgresClient, definition: SchemaDefinition, options: ApplySchemaOptions = {}) => {
	return transact(client, async session => {
		const schema = assertIdentifier(definition.schema)

		// One at a time per schema: two applies that both find a table
		// missing would both create it.
		await session.query(`SELECT pg_advisory_xact_lock(hashtext('awsless.schema.${schema}'))::text`)

		if (options.reset) {
			await session.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
		}

		await session.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
		await session.query(`SET LOCAL search_path TO "${schema}", public`)
		// A change that waits for a table behind a running query gives up
		// instead, so the app's queries don't queue behind the deploy for
		// minutes; the deploy fails and can run again.
		await session.query(`SET LOCAL lock_timeout = '${APPLY_LOCK_TIMEOUT}'`)

		await applyTables(session, schema, definition.tables ?? {}, options)

		// One at a time on a server from here: two files that create the
		// same extension at the same moment would fail each other.
		await session.query("SELECT pg_advisory_xact_lock(hashtext('awsless.functions'))::text")
		await session.query(dropRoutines(schema))

		for (const file of definition.functions ?? []) {
			for (const statement of splitStatements(file.sql)) {
				await runNamed(session, statement.sql, error => {
					return `${file.name}:${statement.line + lineOf(statement.sql, error.position) - 1}`
				})
			}
		}
	})
}
