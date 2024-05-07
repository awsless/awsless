import { Client, ClientOptions } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
import { fromEnv } from '@aws-sdk/credential-providers'
// import { defaultProvider } from '@aws-sdk/credential-provider-node'

let mock: Client

export const searchClient = (options: ClientOptions = {}, service: 'es' | 'aoss' = 'es'): Client => {
	if (mock) {
		return mock
	}

	return new Client({
		node: 'https://' + process.env.SEARCH_DOMAIN,
		...AwsSigv4Signer({
			region: process.env.AWS_REGION!,
			service,
			getCredentials: fromEnv(),
			// getCredentials: () => {
			// 	const credentialsProvider = defaultProvider();
			// 	return credentialsProvider();
			// },
		}),
		...options,
	})
}

export const mockClient = (host: string, port: number) => {
	mock = new Client({ node: `http://${host}:${port}` })
}
