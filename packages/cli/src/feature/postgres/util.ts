import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { dirname, isAbsolute, relative } from 'path'
import { applySchema, type ApplySchemaOptions, isPostgresFunction, postgresClient, type SqlFile } from '@awsless/postgres'
import { getPostgresSchemaName } from 'awsless'
import { StackConfig } from '../../config/stack.js'
import { directories } from '../../util/path.js'

// Deployed, a stack's schema lives in a database of the same name. These
// databases are there before any stack: Postgres' own & the one RDS keeps.
export const RESERVED_DATABASES = ['postgres', 'template0', 'template1', 'rdsadmin']

const require = createRequire(import.meta.url)

const nameOf = (file: string) => (isAbsolute(file) ? relative(directories.root, file) : file)

// Whether a function file is a module of defined functions
// (postgres.function.define), not sql.
export const isFunctionModule = (file: string) => !file.endsWith('.sql')

// The functions a module defines, read as its folder is now: a saved file
// of it is loaded again.
const readDefinedFunctions = (file: string) => {
	const folder = dirname(require.resolve(file))

	for (const loaded of Object.keys(require.cache)) {
		if (loaded.startsWith(folder)) {
			delete require.cache[loaded]
		}
	}

	const definitions = Object.values(require(file) as Record<string, unknown>).filter(isPostgresFunction)

	if (definitions.length === 0) {
		throw new Error(`${nameOf(file)} exports no Postgres function: define them with postgres.function.define.`)
	}

	return definitions.map(definition => ({
		name: `${nameOf(file)} (${definition.functionName})`,
		sql: definition.sql,
	}))
}

// What creates the functions a stack's modules define, as sql files.
// Functions call each other, and a module's exports have no order, so each
// is created twice: first without its body checked, then checked once all
// of them are there.
const toSqlFiles = (modules: string[]): SqlFile[] => {
	const createFiles = modules.flatMap(readDefinedFunctions)
	const name = nameOf(modules[0]!)

	return [
		{ name, sql: 'SET LOCAL check_function_bodies = off' },
		...createFiles,
		{ name, sql: 'SET LOCAL check_function_bodies = on' },
		...createFiles,
	]
}

// A stack's function files in the order they run, named by their path in
// the project for the error of a statement that fails: the .sql files as
// they are, then the functions its modules define.
export const readFunctionFiles = (stack: StackConfig): SqlFile[] => {
	const files = stack.postgres?.functions ?? []
	const modules = files.filter(isFunctionModule)

	return [
		...files
			.filter(file => !isFunctionModule(file))
			.map(file => ({ name: nameOf(file), sql: readFileSync(file, 'utf8') })),
		...(modules.length > 0 ? toSqlFiles(modules) : []),
	]
}

// Brings the schema of every given stack on a local server up to its
// declared tables & function files.
export const applyStackSchemas = async (url: string, stackConfigs: StackConfig[], options: ApplySchemaOptions) => {
	const client = postgresClient({ url, max: 1 })

	try {
		for (const stack of stackConfigs) {
			if (stack.postgres) {
				await applySchema(
					client,
					{
						schema: getPostgresSchemaName(stack.name),
						tables: stack.postgres.tables,
						functions: readFunctionFiles(stack),
					},
					options
				)
			}
		}
	} finally {
		await client.close()
	}
}
