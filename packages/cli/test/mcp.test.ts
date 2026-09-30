import { ExpectedError } from '@awsless/lambda'
import { object, optional, string } from '@awsless/validate'
import {
	describeHandle,
	formatRouteEnvName,
	h,
	InternalInvoke,
	isMcpDescribeRequest,
	withBundleRouteContext,
} from 'awsless'
import { describe, expect, it } from 'vitest'
import handle from '../src/feature/mcp/server/handle'

const serverRoute = 'base:mcp:server'

// The baked tool whitelist, like the stacks register it.
const registerTool = (name: string, props: Record<string, unknown>) => {
	process.env[formatRouteEnvName(serverRoute, `TOOL:${name}`)] = JSON.stringify({
		description: `The ${name} tool.`,
		omit: [],
		permissions: [],
		annotations: { readOnly: false, destructive: true, idempotent: false, openWorld: true },
		...props,
	})
}

registerTool('echo', { function: 'test:mcp:echo' })
registerTool('read-only', {
	function: 'test:mcp:echo',
	omit: ['extra'],
	annotations: { readOnly: true, openWorld: false },
})
registerTool('restricted', { function: 'test:mcp:echo', permissions: ['orders:read'] })
registerTool('failing', { function: 'test:mcp:failing' })

process.env[formatRouteEnvName(serverRoute, 'NAME')] = 'server'
process.env[formatRouteEnvName(serverRoute, 'VERSION')] = 'app'

// Plain functions, exposed as tools without being wrapped in anything -
// their own validator is what the model gets to see.
const echo = h.func(object({ message: string(), extra: optional(string()), auth: optional(string()) }), event => {
	return event
})

const failing = h.func(object({}), () => {
	throw new ExpectedError('nope', 'The tool refused.')
})

const handlers: Record<string, (event: never) => unknown> = {
	'test:mcp:echo': echo,
	'test:mcp:failing': failing,
}

// The same describe interception the bundle runtime does before it
// dispatches to a route handler.
const internalInvoke: InternalInvoke = async (route, payload) => {
	const handler = handlers[route]

	if (!handler) {
		throw new Error('Unknown bundle route: ' + route)
	}

	if (isMcpDescribeRequest(payload)) {
		return describeHandle(handler)
	}

	return handler(payload as never)
}

describe('MCP server', () => {
	const request = (body: unknown, method = 'POST') => {
		return {
			requestContext: { http: { method, userAgent: '', sourceIp: '' } },
			headers: {},
			body: JSON.stringify(body),
		} as any
	}

	const invoke = (body: unknown, method?: string) => {
		return withBundleRouteContext(serverRoute, internalInvoke, () => handle(request(body, method)))
	}

	const call = async (method: string, params?: unknown) => {
		const response = await invoke({ jsonrpc: '2.0', id: 1, method, params })

		return { statusCode: response.statusCode, body: JSON.parse(response.body || '{}') }
	}

	it('should reject a stream request', async () => {
		const response = await invoke({}, 'GET')

		expect(response.statusCode).toBe(405)
	})

	it('should initialize', async () => {
		const { body } = await call('initialize', { protocolVersion: '2025-06-18' })

		expect(body.result.protocolVersion).toBe('2025-06-18')
		expect(body.result.serverInfo.name).toBe('server')
		expect(body.result.capabilities.tools.listChanged).toBe(false)
	})

	it('should keep speaking the revision the client asked for', async () => {
		const { body } = await call('initialize', { protocolVersion: '2025-03-26' })

		expect(body.result.protocolVersion).toBe('2025-03-26')
	})

	it('should answer a notification without a body', async () => {
		const response = await invoke({ jsonrpc: '2.0', method: 'notifications/initialized' })

		expect(response.statusCode).toBe(202)
		expect(response.body).toBe('')
	})

	it('should describe an unwrapped function from its own validator', async () => {
		const { body } = await call('tools/list')
		const tool = body.result.tools.find((t: any) => t.name === 'echo')

		expect(tool.description).toBe('The echo tool.')
		expect(tool.inputSchema.type).toBe('object')
		expect(tool.inputSchema.properties.message).toEqual({ type: 'string' })
		expect(tool.inputSchema.required).toEqual(['message'])
	})

	it('should hide the fields the server injects itself', async () => {
		const { body } = await call('tools/list')
		const tool = body.result.tools.find((t: any) => t.name === 'echo')

		expect(tool.inputSchema.properties.auth).toBeUndefined()
		expect(tool.inputSchema.properties.extra).toBeDefined()
	})

	it('should hide the fields a tool omits', async () => {
		const { body } = await call('tools/list')
		const tool = body.result.tools.find((t: any) => t.name === 'read-only')

		expect(tool.inputSchema.properties.extra).toBeUndefined()
		expect(tool.inputSchema.properties.message).toBeDefined()
	})

	it('should drop the write hints for a read only tool', async () => {
		const { body } = await call('tools/list')
		const tools = Object.fromEntries(body.result.tools.map((t: any) => [t.name, t.annotations]))

		expect(tools['read-only']).toEqual({ readOnlyHint: true, openWorldHint: false })
		expect(tools['echo']).toEqual({
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		})
	})

	it('should hide tools the caller has no permission for', async () => {
		const { body } = await call('tools/list')
		const names = body.result.tools.map((t: any) => t.name)

		expect(names).not.toContain('restricted')
		expect(names).toContain('echo')
	})

	it('should call a tool', async () => {
		const { body } = await call('tools/call', { name: 'echo', arguments: { message: 'hi' } })

		expect(body.result.isError).toBeUndefined()
		expect(body.result.structuredContent.message).toBe('hi')
		expect(body.result.content[0].type).toBe('text')
	})

	it('should report a tool failure as a result the model can read', async () => {
		const { body } = await call('tools/call', { name: 'failing' })

		expect(body.result.isError).toBe(true)
		expect(body.result.content[0].text).toBe('The tool refused.')
	})

	it('should report a tool behind a permission as unknown', async () => {
		const { body } = await call('tools/call', { name: 'restricted', arguments: {} })

		expect(body.error.message).toBe('Unknown tool: restricted')
	})

	it('should reject an unknown method', async () => {
		const { body } = await call('tools/nope')

		expect(body.error.code).toBe(-32601)
	})

	it('should reject an unparsable body', async () => {
		const response = await withBundleRouteContext(serverRoute, internalInvoke, () =>
			handle({
				requestContext: { http: { method: 'POST' } },
				headers: {},
				body: 'not json',
			} as any)
		)

		expect(response.statusCode).toBe(400)
	})
})
