import { ExpectedError, ViewableError } from '@awsless/lambda'
import { APIGatewayProxyEventV2 } from 'aws-lambda'
import { getRouteEnv, internalInvoke } from 'awsless'
import { authenticate, Session, unauthorized, UnauthorizedError } from './auth.js'
import {
	accepted,
	error,
	INTERNAL_ERROR,
	INVALID_PARAMS,
	JsonRpcId,
	METHOD_NOT_FOUND,
	PARSE_ERROR,
	PROTOCOL_VERSION,
	Response,
	result,
	SUPPORTED_PROTOCOL_VERSIONS,
} from './protocol.js'
import { getTool, isAllowed, listTools } from './tools.js'
import { parseCallParams, parseRequest } from './validate.js'

const initialize = (id: JsonRpcId, params?: Record<string, unknown>) => {
	const requested = params?.protocolVersion

	return result(id, {
		protocolVersion:
			typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
				? requested
				: PROTOCOL_VERSION,

		// No listChanged, since a stateless server has no stream to send
		// the notification on. Clients re-list when they reconnect.
		capabilities: { tools: { listChanged: false } },

		serverInfo: {
			name: getRouteEnv('NAME'),
			title: getRouteEnv('TITLE') || undefined,
			version: getRouteEnv('VERSION'),
		},

		instructions: getRouteEnv('INSTRUCTIONS') || undefined,
	})
}

const callTool = async (
	id: JsonRpcId,
	params: Record<string, unknown> | undefined,
	session: Session | undefined,
	event: APIGatewayProxyEventV2
): Promise<Response> => {
	const parsed = parseCallParams(params)

	if (!parsed.success) {
		return error(id, INVALID_PARAMS, parsed.issues[0]!.message)
	}

	const tool = getTool(parsed.output.name)

	// A tool the caller may not use reports as unknown rather than
	// forbidden, so the listing & the call agree and we never leak which
	// tools exist behind a permission.
	if (!tool || !isAllowed(tool, session)) {
		return error(id, INVALID_PARAMS, `Unknown tool: ${parsed.output.name}`)
	}

	try {
		const data = await internalInvoke(tool.function, {
			...parsed.output.arguments,
			auth: session,
			viewer: {
				userAgent: event.requestContext.http.userAgent,
				ip: event.requestContext.http.sourceIp,
			},
		})

		return result(id, {
			content: [{ type: 'text', text: JSON.stringify(data) }],
			structuredContent: data,
		})
	} catch (err) {
		// Tool failures come back as results, not protocol errors, so the
		// model reads the message and gets to try something else.
		if (err instanceof ViewableError || err instanceof ExpectedError) {
			return result(id, {
				content: [{ type: 'text', text: err.message }],
				isError: true,
			})
		}

		console.error(err)

		return result(id, {
			content: [{ type: 'text', text: 'Oops, something went wrong!' }],
			isError: true,
		})
	}
}

export default async (event: APIGatewayProxyEventV2): Promise<Response> => {
	const method = event.requestContext?.http?.method

	// Without a stream there is nothing to open, and no session to end.
	if (method === 'GET') {
		return { statusCode: 405, headers: { allow: 'POST' }, body: '' }
	}

	if (method === 'DELETE') {
		return { statusCode: 204, body: '' }
	}

	let session: Session | undefined

	try {
		// The router tunnels the viewer authorization past cloudfront's own
		// signature & the bundle restores it before we run.
		session = await authenticate(event.headers?.authorization)
	} catch (err) {
		if (err instanceof UnauthorizedError) {
			return unauthorized(err.message)
		}

		console.error(err)

		return { statusCode: 500, body: '' }
	}

	const request = parseRequest(event)

	if (!request.success) {
		return error(null, PARSE_ERROR, request.issues[0]!.message)
	}

	const { id = null, method: rpcMethod, params } = request.output.body

	try {
		switch (rpcMethod) {
			case 'initialize':
				return initialize(id, params)

			case 'ping':
				return result(id, {})

			case 'tools/list':
				return result(id, { tools: await listTools(session) })

			case 'tools/call':
				return callTool(id, params, session, event)
		}

		// Every remaining notification is a client side lifecycle event we
		// have nothing to do with.
		if (rpcMethod.startsWith('notifications/')) {
			return accepted()
		}

		return error(id, METHOD_NOT_FOUND, `Method not found: ${rpcMethod}`)
	} catch (err) {
		console.error(err)

		return error(id, INTERNAL_ERROR, 'Internal error')
	}
}
