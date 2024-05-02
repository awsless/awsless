import { Client, ClientOptions } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
import { fromEnv } from '@aws-sdk/credential-providers'
// import { defaultProvider } from '@aws-sdk/credential-provider-node'

let client: Client

export const searchClient = (options: ClientOptions = {}): Client => {
	if (!client) {
		client = new Client({
			node: 'https://' + process.env.SEARCH_DOMAIN,
			// enableLongNumeralSupport: true,
			// requestTimeout: 3000,
			...AwsSigv4Signer({
				region: process.env.AWS_REGION!,
				service: 'es',
				getCredentials: fromEnv(),
				// getCredentials: () => {
				// 	const credentialsProvider = defaultProvider();
				// 	return credentialsProvider();
				// },
			}),
			...options,
		})
	}

	return client
}

export const mockClient = (host: string, port: number) => {
	client = new Client({ node: `http://${host}:${port}` })
}
