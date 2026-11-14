import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import type { ReadableStream as WebReadableStream } from 'stream/web'
import type { LambdaContext } from '@awsless/lambda'
import { DEPLOYMENT_ID_HEADER } from 'awsless'
import type { Bundle } from './handle.js'

const createLambdaContext = (requestId: string, timeout: number): LambdaContext => {
	const deadline = Date.now() + timeout
	const functionName = process.env.AWSLESS_WEB_FUNCTION_NAME ?? ''

	return {
		callbackWaitsForEmptyEventLoop: false,
		functionName,
		functionVersion: '$LATEST',
		// No qualifier, so internal calls out of the bundle reach its live alias.
		invokedFunctionArn: '',
		memoryLimitInMB: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE ?? '',
		awsRequestId: requestId,
		logGroupName: '',
		logStreamName: '',
		getRemainingTimeInMillis: () => Math.max(0, deadline - Date.now()),
		done: () => {},
		fail: () => {},
		succeed: () => {},
	}
}

// Node's request as a web Request whose body streams as it arrives. The
// router tunnels the viewer's authorization past CloudFront's signing, and
// CloudFront's own signature never reaches a handler as the caller's.
export const createWebRequest = (incoming: IncomingMessage, signal: AbortSignal) => {
	const headers = new Headers()

	for (const [name, values] of Object.entries(incoming.headersDistinct)) {
		for (const value of values ?? []) {
			headers.append(name, value)
		}
	}

	const viewerAuthorization = headers.get('x-awsless-authorization')

	headers.delete('x-awsless-authorization')

	if (viewerAuthorization) {
		headers.set('authorization', viewerAuthorization)
	} else if (headers.get('authorization')?.startsWith('AWS4-')) {
		headers.delete('authorization')
	}

	// The rest of CloudFront's signature.
	headers.delete('x-amz-security-token')
	headers.delete('x-amz-date')

	const method = incoming.method ?? 'GET'
	const host = headers.get('x-forwarded-host') || headers.get('host') || 'localhost'
	const protocol = headers.get('x-forwarded-proto') ?? 'https'
	const hasBody = method !== 'GET' && method !== 'HEAD'

	return new Request(`${protocol}://${host}${incoming.url ?? '/'}`, {
		method,
		headers,
		body: hasBody ? (Readable.toWeb(incoming) as unknown as ReadableStream<Uint8Array>) : undefined,
		signal,
		// A streamed request body needs it in undici.
		duplex: 'half',
	} as RequestInit)
}

export const writeWebResponse = async (
	response: Response,
	outgoing: ServerResponse,
	{ isCacheable = true }: { isCacheable?: boolean } = {}
) => {
	const headers: string[] = []

	response.headers.forEach((value, name) => {
		if (name !== 'set-cookie' && (isCacheable || name !== 'cache-control')) {
			headers.push(name, value)
		}
	})

	if (!isCacheable) {
		headers.push('cache-control', 'no-store')
	}

	for (const cookie of response.headers.getSetCookie()) {
		headers.push('set-cookie', cookie)
	}

	outgoing.writeHead(response.status, headers)

	if (outgoing.req.method === 'HEAD') {
		// A HEAD has no body to wait for.
		await response.body?.cancel()
		outgoing.end()
	} else if (response.body) {
		// Written as it comes, at the pace the connection takes it.
		await pipeline(Readable.fromWeb(response.body as unknown as WebReadableStream), outgoing)
	} else {
		outgoing.end()
	}
}

// Serves the bundle's router paths in the web function, many requests at
// a time in one process. Lambda names the address to listen on in
// AWS_LAMBDA_HTTP_ENDPOINT.
export const startWebFunctionServer = (bundle: Pick<Bundle, 'serveRequest'>) => {
	const listenAddress = process.env.AWS_LAMBDA_HTTP_ENDPOINT ?? '127.0.0.1:8080'
	const separator = listenAddress.lastIndexOf(':')
	const host = listenAddress.slice(0, separator)
	const port = Number(listenAddress.slice(separator + 1))
	// A web function has no lambda context, so the revision's env names its timeout.
	const timeout = Number(process.env.AWSLESS_WEB_FUNCTION_TIMEOUT_SECONDS) * 1000

	const server = createServer(async (incoming, outgoing) => {
		// A caller that goes away cancels the request, so a handler can stop.
		const controller = new AbortController()

		outgoing.once('close', () => {
			if (!outgoing.writableFinished) {
				controller.abort()
			}
		})

		try {
			const request = createWebRequest(incoming, controller.signal)
			const requestId = request.headers.get('lambda-web-request-id') ?? crypto.randomUUID()

			// During a promotion the endpoint serves the new revision before the
			// route tables follow, so its answer to another deployment's table is
			// never cached under that table's key.
			const isCacheable = request.headers.get(DEPLOYMENT_ID_HEADER) === process.env.AWSLESS_DEPLOYMENT_ID

			await bundle.serveRequest(
				request,
				response => writeWebResponse(response, outgoing, { isCacheable }),
				createLambdaContext(requestId, timeout)
			)
		} catch (error) {
			// A caller that went away is no error of ours.
			if (controller.signal.aborted) {
				return
			}

			console.error(error)

			if (!outgoing.headersSent) {
				outgoing.writeHead(500, { 'content-type': 'application/json', 'cache-control': 'no-store' })
				outgoing.end(JSON.stringify({ message: 'Internal Server Error' }))
			} else {
				outgoing.destroy()
			}
		}
	})

	// Lambda keeps its connections to the environment open between requests.
	server.keepAliveTimeout = timeout + 5_000
	server.headersTimeout = timeout + 10_000

	server.listen(port, host)

	process.once('SIGTERM', () => {
		server.close()
	})

	return server
}
