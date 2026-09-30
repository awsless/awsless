import { getHandleSchema } from '@awsless/lambda'
import { toJsonSchema } from '@awsless/validate'

// The payload property that asks a route for its input contract instead
// of running it. Tools describe themselves from the validator their
// handler already enforces, so an existing function becomes a tool
// without being wrapped in anything.
export const MCP_DESCRIBE_PROPERTY = '$awsless-mcp-describe'

export type ToolContract = {
	inputSchema: Record<string, unknown>
}

const EMPTY_INPUT = { type: 'object', properties: {} }

export const isMcpDescribeRequest = (payload: unknown) => {
	return typeof payload === 'object' && payload !== null && MCP_DESCRIBE_PROPERTY in payload
}

export const describeHandle = (handle: unknown): ToolContract => {
	const schema = getHandleSchema(handle)

	// A handler without a validator takes no arguments as far as the
	// model is concerned.
	if (!schema) {
		return { inputSchema: EMPTY_INPUT }
	}

	// A schema the converter can't express degrades to a looser json
	// schema instead of failing the whole tool listing. The handler
	// still validates the real thing.
	const json = toJsonSchema(schema, { errorMode: 'ignore' }) as Record<string, unknown>

	return { inputSchema: json.type === 'object' ? json : EMPTY_INPUT }
}
