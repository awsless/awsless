import { LambdaClient, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda'
import { Credentials } from './aws'

export const restartLambdaFunctions = async ({
	credentials,
	region,
	functions,
}: {
	credentials: Credentials
	region: string
	functions: {
		functionName: string
		s3: {
			bucket: string
			key: string
			version?: string
		}
	}[]
}) => {
	const client = new LambdaClient({
		credentials,
		region,
	})

	await Promise.all(
		functions.map(async item => {
			// const result = await client.send(
			// 	new GetFunctionCommand({
			// 		FunctionName: item.functionName,
			// 	})
			// )

			// console.log(result)

			await client.send(
				new UpdateFunctionCodeCommand({
					FunctionName: item.functionName,
					S3Bucket: item.s3.bucket,
					S3Key: item.s3.key,
					S3ObjectVersion: item.s3.version ? item.s3.version : undefined,
					Publish: false,
				})
			)
			// console.log(response)
		})
	)
}
