
import { CloudFormationClient, ListExportsCommand } from '@aws-sdk/client-cloudformation'
import { CloudFormationCustomResourceEvent } from 'aws-lambda'
import { send } from '../util.js'

export const handler = async (event: CloudFormationCustomResourceEvent) => {
	const region = event.ResourceProperties.region

	try {
		const data = await listExports(region)

		await send(event, region, 'SUCCESS', data)
	} catch(error) {
		if (error instanceof Error) {
			await send(event, region, 'FAILED', {}, error.message)
		} else {
			await send(event, region, 'FAILED', {}, 'Unknown error')
		}

		console.error(error);
	}
}

const listExports = async (region: string) => {
	const client = new CloudFormationClient({ region })
	const data: Record<string, string> = {}

	let token: string | undefined

	while(true) {
		const result = await client.send(new ListExportsCommand({
			NextToken: token
		}))

		result.Exports?.forEach(item => {
			data[item.Name!] = item.Value!
		})

		if(result.NextToken) {
			token = result.NextToken
		} else {
			return data
		}
	}
}
