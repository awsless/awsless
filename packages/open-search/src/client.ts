import { Agent } from 'node:https'
import { fromEnv } from '@aws-sdk/credential-providers'
import { Client, ClientOptions } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'

let mock: Client

export const searchClient = (options: ClientOptions = {}, service: 'es' | 'aoss' = 'es'): Client => {
	if (mock) {
		return mock
	}

	// The local dev server runs plain http - the scheme follows the
	// environment, like the aws sdk clients do through AWS_ENDPOINT_URL.
	const scheme = process.env.AWSLESS_ENV === 'local' ? 'http://' : 'https://'
	const node = options.node ?? scheme + process.env.SEARCH_DOMAIN

	// The node option also accepts object & array forms - resolve the
	// first entry's url to detect the protocol, instead of stringifying
	// an object into "[object Object]".
	const first = Array.isArray(node) ? node[0] : node
	const nodeUrl = typeof first === 'string' ? first : String((first as { url?: unknown } | undefined)?.url ?? '')

	return new Client({
		node,
		// Fail fast inside a lambda instead of the 30s default, & skip
		// socket reuse since frozen sandboxes hold dead sockets.
		// Both can be overridden through the options. The local dev &
		// test servers run plain http, where an https agent won't fly.
		requestTimeout: 5000,
		agent: nodeUrl.startsWith('https')
			? () =>
					new Agent({
						keepAlive: false,
					})
			: undefined,
		...AwsSigv4Signer({
			region: process.env.AWS_REGION!,
			service,
			getCredentials: fromEnv(),
		}),
		...options,
	})
}

export const mockClient = (host: string, port: number) => {
	mock = new Client({ node: `http://${host}:${port}` })
}
