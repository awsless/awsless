import { mysqlClient } from './client'
import { PoolOptions } from 'mysql2'
import { FileMigrationProvider, Kysely, MigrationResult, Migrator, sql } from 'kysely'
import { promises as fs } from 'fs'
import path from 'path'

export const command = async <T, U>(
	options: PoolOptions,
	callback: (client: Kysely<T>) => Promise<U>
): Promise<U> => {
	const client = mysqlClient<T>(options)

	let result: U | undefined

	try {
		result = await callback(client)
	} catch (error) {
		throw error
	} finally {
		await client.destroy()
	}

	return result
}

export const migrate = async <T>(migrations: Record<string, string>, options: PoolOptions) => {
	await Promise.all(
		Object.entries(migrations).map(async ([database]) => {
			await command(options, async client => {
				await sql`CREATE DATABASE ${sql.raw(database)}`.execute(client)
			})
		})
	)

	const results = await Promise.all(
		Object.entries(migrations).map(async ([database, migrationFolder]) => {
			return command<T, MigrationResult[] | undefined>({ database, ...options }, async client => {
				const migrator = new Migrator({
					db: client,
					provider: new FileMigrationProvider({
						fs,
						path,
						migrationFolder,
					}),
				})

				const { error, results } = await migrator.migrateToLatest()

				if (error) {
					throw error
				}

				return results
			})
		})
	)

	const object: Record<string, MigrationResult[] | undefined> = {}
	Object.entries(migrations).map(([database], i) => {
		object[database] = results[i]
	})

	return object
}
