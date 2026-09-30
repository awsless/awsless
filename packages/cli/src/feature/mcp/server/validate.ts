import { json, literal, number, object, optional, record, safeParse, string, union, unknown } from '@awsless/validate'

const messageSchema = object({
	jsonrpc: literal('2.0'),

	// Absent on notifications, which never get a reply.
	id: optional(union([string(), number()])),
	method: string(),
	params: optional(record(string(), unknown())),
})

export const requestSchema = object({
	requestContext: object({
		http: object({
			method: string(),
			userAgent: optional(string()),
			sourceIp: optional(string()),
		}),
	}),
	headers: record(string(), optional(string())),
	body: json(messageSchema),
})

export const parseRequest = (event: unknown) => {
	return safeParse(requestSchema, event)
}

const callParamsSchema = object({
	name: string(),
	arguments: optional(record(string(), unknown())),
})

export const parseCallParams = (params: unknown) => {
	return safeParse(callParamsSchema, params)
}
