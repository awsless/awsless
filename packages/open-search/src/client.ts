import { Client } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
import { fromEnv } from '@aws-sdk/credential-providers'
// import { defaultProvider } from '@aws-sdk/credential-provider-node'

let client: Client

export const searchClient = () => {
	if (!client) {
		client = new Client({
			node: 'https://' + process.env.SEARCH_DOMAIN,
			...AwsSigv4Signer({
				region: process.env.AWS_REGION!,
				service: 'es',
				getCredentials: fromEnv(),
				// getCredentials: () => {
				// 	const credentialsProvider = defaultProvider();
				// 	return credentialsProvider();
				// },
			}),
		})
	}

	return client
}

export const mockClient = (host: string, port: number) => {
	client = new Client({ node: `http://${host}:${port}` })
}
