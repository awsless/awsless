import { Client } from '@opensearch-project/opensearch'
// import { fromEnv }		from '@aws-sdk/credential-providers'
import createConnector from 'aws-opensearch-connector'

let client: Client

export const searchClient = async () => {
	if (!client) {
		client = new Client({
			...createConnector({
				region: process.env.AWS_REGION,
				// credentials: await fromEnv()(),
			}),
			node: 'https://' + process.env.SEARCH_DOMAIN,
		})
	}

	return client
}

export const mockClient = (host: string, port: number) => {
	client = new Client({ node: `http://${host}:${port}` })
}
