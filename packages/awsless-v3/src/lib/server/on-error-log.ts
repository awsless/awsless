import { date, object, optional, picklist, string, unknown } from '@awsless/validate'

export const onErrorLogSchema = object({
	hash: string(),
	requestId: string(),
	origin: string(),
	level: picklist(['warn', 'error', 'fatal']),
	type: string(),
	message: string(),
	stackTrace: optional(string()),
	data: optional(unknown()),
	date: date(),
})

// export const imageOriginSchema = object({
// 	path: string(),
// })
