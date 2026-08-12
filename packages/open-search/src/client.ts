import { fromEnv } from '@aws-sdk/credential-providers'
import { Client, ClientOptions } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
import { Agent } from 'node:https'

let mock: Client

export const searchClient = (options: ClientOptions = {}, service: 'es' | 'aoss' = 'es'): Client => {
	if (mock) {
		return mock
	}

	const node = options.node ?? 'https://' + process.env.SEARCH_DOMAIN

	return new Client({
		node,
		// Fail fast inside a lambda instead of the 30s default, & skip
		// socket reuse since frozen sandboxes hold dead sockets.
		// Both can be overridden through the options. The local dev &
		// test servers run plain http, where an https agent won't fly.
		requestTimeout: 5000,
		agent: String(node).startsWith('https')
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
