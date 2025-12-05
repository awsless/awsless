import { array, define, object, optional, string, ttl } from '@awsless/dynamodb'

export const schemaTable = define(process.env.SCHEMA_TABLE ?? 'schema', {
	hash: 'query',
	schema: object({
		query: string(),
		function: string(),
		permissions: optional(array(string())),
	}),
})

export const lockTable = define(process.env.LOCK_TABLE ?? 'lock', {
	hash: 'key',
	schema: object({
		key: string(),
		ttl: ttl(),
		requestId: string(),
	}),
})
