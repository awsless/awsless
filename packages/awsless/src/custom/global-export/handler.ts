import { sendCode } from "../util";

export const globalExportsHandlerCode = /* JS */ `

const { CloudFormationClient, ListExportsCommand } = require('@aws-sdk/client-cloudformation')

${ sendCode }

exports.handler = async (event) => {
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
	}
}

const listExports = async (region) => {
	const client = new CloudFormationClient({ region })
	const data = {}

	let token

	while(true) {
		const result = await client.send(new ListExportsCommand({
			NextToken: token
		}))

		result.Exports?.forEach(item => {
			data[item.Name] = item.Value
		})

		if(result.NextToken) {
			token = result.NextToken
		} else {
			return data
		}
	}
}
`
