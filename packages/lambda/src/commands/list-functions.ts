import { type LambdaClient, ListFunctionsCommand, ListFunctionsCommandInput } from '@aws-sdk/client-lambda'
import { lambdaClient } from '../helpers/client'

export const listFunctions = async ({
	client = lambdaClient(),
	...params
}: ListFunctionsCommandInput & { client?: LambdaClient }) => {
	const command = new ListFunctionsCommand(params)
	const result = await client.send(command)

	if (!result.Functions) {
		return
	}

	return result
}
