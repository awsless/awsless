import { Kysely, MysqlDialect } from 'kysely'
import { createPool, PoolOptions } from 'mysql2'

let optionOverrides: PoolOptions = {}
export const overrideOptions = (options: PoolOptions) => {
	optionOverrides = options
}

export const mysqlClient = <T>(options: PoolOptions) => {
	return new Kysely<T>({
		dialect: new MysqlDialect({
			pool: createPool({
				connectionLimit: 1,
				enableKeepAlive: false,
				waitForConnections: false,
				idleTimeout: 200,
				...options,
				...optionOverrides,
			}),
		}),
	})
}
