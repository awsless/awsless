import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs'
import { stringify } from '@awsless/json'
import { ecsClient } from './client'

export type RunTaskOptions = {
	client?: ECSClient
	cluster: string
	taskDefinition: string
	subnets: string[]
	securityGroups: string[]
	container: string
	payload?: unknown
	assignPublicIp?: boolean
}

export const runTask = async ({
	client = ecsClient(),
	cluster,
	taskDefinition,
	subnets,
	securityGroups,
	container,
	payload,
	assignPublicIp = true,
}: RunTaskOptions) => {
	const result = await client.send(
		new RunTaskCommand({
			cluster,
			taskDefinition,
			launchType: 'FARGATE',
			networkConfiguration: {
				awsvpcConfiguration: {
					subnets,
					securityGroups,
					assignPublicIp: assignPublicIp ? 'ENABLED' : 'DISABLED',
				},
			},
			overrides: {
				containerOverrides: [
					{
						name: container,
						environment:
							payload !== undefined
								? [
										{
											name: 'PAYLOAD',
											value: stringify(payload),
										},
									]
								: [],
					},
				],
			},
			count: 1,
		})
	)

	if (result.failures && result.failures.length > 0) {
		const { reason, detail } = result.failures[0]!
		throw new Error(`ECS RunTask failed: ${reason}${detail ? ` - ${detail}` : ''}`)
	}

	return { taskArn: result.tasks?.[0]?.taskArn }
}
