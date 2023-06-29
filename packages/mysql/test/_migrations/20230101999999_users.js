import { Kysely } from 'kysely'

export async function up(db) {
	await db.schema
		.createTable('users')
		.addColumn('id', 'varchar(100)', col => col.primaryKey())
		.addColumn('name', 'varchar(255)', col => col.notNull())
		.execute()
}

export async function down(db) {
	await db.schema.dropTable('users').execute()
}
