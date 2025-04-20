// import { IoTCustomAuthorizerEvent, IoTCustomAuthorizerResult } from 'aws-lambda'

const policy: {
	publish?: string[]
	subscribe?: string[]
} = process.env.PUBSUB_POLICY ? JSON.parse(process.env.PUBSUB_POLICY) : {}

const region = process.env.AWS_REGION
const accountId = process.env.AWS_ACCOUNT_ID
const prefix = `arn:aws:iot:${region}:${accountId}`

export default async (event: any) => {
	console.log(event)
	console.log(policy)
	// console.log(prefix)

	const response = {
		isAuthenticated: true,
		principalId: 'userId',
		disconnectAfterInSeconds: 86400,
		refreshAfterInSeconds: 86400,
		policyDocuments: [
			{
				Version: '2012-10-17',
				Statement: [
					{
						// Action: ['iot:Connect', 'iot:Publish', 'iot:Subscribe', 'iot:Receive'],
						Action: 'iot:*',
						Effect: 'Allow',
						Resource: '*',
					},

					// {
					// 	Action: 'iot:Connect',
					// 	Effect: 'Allow',
					// 	// Resource: '*',
					// 	Resource: `${prefix}:client/\${iot:ClientId}`,
					// },
					// ...(policy.publish ?? []).map(topic => ({
					// 	Action: 'iot:Publish',
					// 	Effect: 'Allow',
					// 	Resource: `${prefix}:topic/${topic}`,
					// })),
					// ...(policy.subscribe ?? [])
					// 	.map(topic => [
					// 		{
					// 			Action: 'iot:Subscribe',
					// 			Effect: 'Allow',
					// 			Resource: `${prefix}:topicfilter/${topic}`,
					// 		},
					// 		{
					// 			Action: 'iot:Receive',
					// 			Effect: 'Allow',
					// 			Resource: `${prefix}:topic/${topic}`,
					// 		},
					// 	])
					// 	.flat(),
				],
			},
		],
	}

	console.log(response)

	return response
}
