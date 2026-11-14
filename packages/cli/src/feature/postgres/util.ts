import { readFileSync } from 'fs'
import { isAbsolute, relative } from 'path'
import { applySchema, type ApplySchemaOptions, postgresClient } from '@awsless/postgres'
import { getPostgresSchemaName } from 'awsless'
import { StackConfig } from '../../config/stack.js'
import { directories } from '../../util/path.js'

// Deployed, a stack's schema lives in a database of the same name. These
// databases are there before any stack: Postgres' own & the one RDS keeps.
export const RESERVED_DATABASES = ['postgres', 'template0', 'template1', 'rdsadmin']

// A stack's function files in the order they run, named by their path in
// the project for the error of a statement that fails.
export const readFunctionFiles = (stack: StackConfig) => {
	return (stack.postgres?.functions ?? []).map(file => ({
		name: isAbsolute(file) ? relative(directories.root, file) : file,
		sql: readFileSync(file, 'utf8'),
	}))
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
