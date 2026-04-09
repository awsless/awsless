import { date, define, number, object, optional, string, unknown } from '@awsless/dynamodb'

export const logTable = define('app-kennedy--stack--table--logs', {
	hash: 'hash',
	schema: object({
		hash: string(),
		logLevel: string<'error' | 'warn' | 'fatal'>(),
		type: string(),
		message: string(),
		origin: string(),
		stackTrace: optional(string()),
		data: optional(unknown()),
		updatedAt: date(),
		createdAt: date(),
		count: number(),
	}),
	indexes: {
		'log-level': {
			hash: 'logLevel',
			sort: 'updatedAt',
		},
		lambda: {
			hash: 'resource',
			sort: 'updatedAt',
		},
	},
})
