import {
	array,
	date,
	isoTimestamp,
	object,
	optional,
	picklist,
	pipe,
	string,
	transform,
	union,
	unknown,
} from '@awsless/validate'

export const onErrorLogSchema = object({
	hash: string(),
	requestId: string(),
	origin: string(),
	level: picklist(['warn', 'error', 'fatal']),
	type: string(),
	message: string(),
	stackTrace: optional(array(string())),
	data: optional(unknown()),
	date: union([
		date(),
		pipe(
			string(),
			isoTimestamp(),
			transform(v => new Date(v))
		),
	]),
})

// export const imageOriginSchema = object({
// 	path: string(),
// })
