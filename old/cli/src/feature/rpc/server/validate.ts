import {
	array,
	duration,
	json,
	literal,
	maxLength,
	minLength,
	object,
	optional,
	pipe,
	record,
	safeParse,
	string,
	union,
	unknown,
} from '@awsless/validate'

export const requestSchema = object({
	requestContext: object({
		http: object({
			method: literal('POST'),
			userAgent: string(),
			sourceIp: string(),
		}),
	}),
	// headers: object({
	// 	authentication: optional(string([maxLength(1024)])),
	// }),
	headers: record(string(), string()),
	body: json(
		pipe(
			array(
				object({
					name: pipe(string(), minLength(1), maxLength(64)),
					payload: optional(record(string(), unknown())),
				})
			),
			minLength(1),
			maxLength(10)
		)
	),
})

export const parseRequest = (body: unknown) => {
	return safeParse(requestSchema, body)
}

const authResponseSchema = union([
	object({
		authorized: literal(true),
		context: optional(record(string(), unknown())),
		allowedFunctions: optional(array(string())),
		lockKey: optional(string()),
		ttl: duration(),
	}),

	object({
		authorized: literal(false),
	}),
])

export const parseAuthResponse = (body: unknown) => {
	return safeParse(authResponseSchema, body)
}
