import {
	array,
	boolean,
	duration,
	json,
	maxLength,
	minLength,
	object,
	optional,
	record,
	safeParse,
	string,
	unknown,
} from '@awsless/validate'

const requestSchema = object({
	requestContext: object({
		http: object({
			userAgent: string(),
			sourceIp: string(),
		}),
	}),
	// headers: object({
	// 	authentication: optional(string([maxLength(1024)])),
	// }),
	headers: record(string(), string()),
	body: json(
		array(
			object({
				name: string([minLength(1), maxLength(64)]),
				payload: optional(record(string(), unknown())),
			}),
			[minLength(1), maxLength(10)]
		)
	),
})

export const parseRequest = (body: unknown) => {
	return safeParse(requestSchema, body)
}

const authResponseSchema = object({
	authorized: boolean(),
	context: optional(record(unknown())),
	ttl: duration(),
})

export const parseAuthResponse = (body: unknown) => {
	return safeParse(authResponseSchema, body)
}
