// The revision we implement. Everything here is request/response only,
// so the server never opens a stream back to the client.
export const PROTOCOL_VERSION = '2025-06-18'

// Older clients that still send the previous revision keep working, so
// we echo back whichever of these they asked for.
export const SUPPORTED_PROTOCOL_VERSIONS = [PROTOCOL_VERSION, '2025-03-26']

export type JsonRpcId = string | number | null

export type Response = {
	statusCode: number
	headers?: Record<string, string>
	body: string
}

export const PARSE_ERROR = -32700
export const INVALID_REQUEST = -32600
export const METHOD_NOT_FOUND = -32601
export const INVALID_PARAMS = -32602
export const INTERNAL_ERROR = -32603

const json = (statusCode: number, body: unknown, headers?: Record<string, string>): Response => {
	return {
		statusCode,
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body),
	}
}

export const result = (id: JsonRpcId, value: unknown): Response => {
	return json(200, { jsonrpc: '2.0', id, result: value })
}

// A protocol level error still completes the http request - only a body
// we couldn't parse is a transport failure.
export const error = (id: JsonRpcId, code: number, message: string): Response => {
	return json(code === PARSE_ERROR || code === INVALID_REQUEST ? 400 : 200, {
		jsonrpc: '2.0',
		id,
		error: { code, message },
	})
}

// Notifications & responses carry no reply body of their own.
export const accepted = (): Response => {
	return { statusCode: 202, body: '' }
}
