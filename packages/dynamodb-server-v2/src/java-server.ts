import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import { spawn } from 'dynamo-db-local'

export interface JavaServerInstance {
	port: number
	stop: () => Promise<void>
	ping: () => Promise<boolean>
	wait: (times?: number) => Promise<void>
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export function createJavaServer(port: number, region: string): JavaServerInstance {
	const childProcess = spawn({ port })

	const getClient = () =>
		new DynamoDBClient({
			endpoint: `http://localhost:${port}`,
			region,
			credentials: {
				accessKeyId: 'fake',
				secretAccessKey: 'fake',
			},
		})

	const ping = async (): Promise<boolean> => {
		const client = getClient()
		try {
			const response = await client.send(new ListTablesCommand({}))
			return Array.isArray(response.TableNames)
		} catch {
			return false
		}
	}

	const wait = async (times: number = 10): Promise<void> => {
		while (times--) {
			if (await ping()) {
				return
			}
			await sleep(100 * (times + 1))
		}
		throw new Error('DynamoDB server is unavailable')
	}

	return {
		port,
		stop: async () => {
			childProcess.kill()
		},
		ping,
		wait,
	}
}
