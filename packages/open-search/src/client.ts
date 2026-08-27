import { Agent } from 'node:https'
import { fromEnv } from '@aws-sdk/credential-providers'
import { Client, ClientOptions } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'

let mock: Client

export const searchClient = (options: ClientOptions = {}, service: 'es' | 'aoss' = 'es'): Client => {
	if (mock) {
		return mock
	}

	// The search domain env is a full url, scheme included - the local
	// dev & test servers run plain http, deployed collections https.
	const node = options.node ?? process.env.SEARCH_DOMAIN

	if (!node) {
		throw new Error('No search domain - set the SEARCH_DOMAIN env or pass the node option.')
	}

	// The node option also accepts object & array forms - the first
	// entry's url detects the protocol.
	const first = Array.isArray(node) ? node[0] : node
	const nodeUrl = typeof first === 'string' ? first : (first?.url.href ?? '')

	return new Client({
		node,
		// Serverless endpoints can have coldstarst > 10s
		requestTimeout: isServerlessEndpoint(nodeUrl) ? 30_000 : 5000,
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

// Serverless collection endpoints carry the aoss service subdomain.
export const isServerlessEndpoint = (endpoint?: string): boolean => {
	return endpoint?.includes('.aoss.') ?? false
}

export const isServerless = (client: Client): boolean => {
	return isServerlessEndpoint(client.connectionPool.connections[0]?.url.href)
}
