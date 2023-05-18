import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { parseUrl } from '@aws-sdk/url-parser'
import { Endpoint } from '@aws-sdk/types'
import { sleepAwait } from 'sleep-await'

// @ts-ignore
import dynamoDbLocal from 'dynamo-db-local'

export class DynamoDBServer {
	private client?: DynamoDBClient
	private documentClient?: DynamoDBDocumentClient
	private endpoint: Endpoint

	private process: any

	constructor(private region = 'us-east-1') {
		this.endpoint = parseUrl(`http://localhost`)
	}

	async listen(port: number) {
		if (this.process) {
			throw new Error(`DynamoDB server is already listening on port: ${this.endpoint.port}`)
		}

		if(port < 0 || port >= 65536) {
			throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`)
		}

		this.endpoint.port = port
		this.process = await dynamoDbLocal.spawn({ port })
	}

	/** Kill the DynamoDB server. */
	async kill() {
		if (this.process) {
			await this.process.kill()
			this.process = undefined
		}
	}

	/** Ping the DynamoDB server if its ready. */
	async ping() {
		const client = this.getClient()
		const command = new ListTablesCommand({})
		try {
			const response = await client.send(command)
			return Array.isArray(response.TableNames)
		} catch (error) {
			return false
		}
	}

	/** Ping the DynamoDB server untill its ready. */
	async wait(times: number = 10) {
		while (times--) {
			if (await this.ping()) {
				return
			}

			await sleepAwait(100 * times)
		}

		throw new Error('DynamoDB server is unavailable')
	}

	/** Get DynamoDBClient connected to dynamodb local. */
	getClient() {
		if (!this.client) {
			this.client = new DynamoDBClient({
				maxAttempts: 3,
				endpoint: this.endpoint,
				region: this.region,
				tls: false,
				credentials: {
					accessKeyId: 'fake',
					secretAccessKey: 'fake',
				},
			})
		}

		return this.client
	}

	/** Get DynamoDBDocumentClient connected to dynamodb local. */
	getDocumentClient() {
		if (!this.documentClient) {
			this.documentClient = DynamoDBDocumentClient.from(this.getClient(), {
				marshallOptions: {
					removeUndefinedValues: true,
				},
			})
		}

		return this.documentClient
	}
}
