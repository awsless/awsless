import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs'
import { stringify } from '@awsless/json'
import { createProxy } from '../proxy.js'
import { APP, bindLocalResourceName } from './util.js'

export const getJobName = bindLocalResourceName('job')

export interface JobResources {}

const client = new ECSClient({})

export const Job: JobResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(jobName => {
		const name = getJobName(jobName, stackName)
		const ctx: Record<string, any> = {
			[name]: async (payload: unknown) => {
				const cluster = `${APP}-job`
				const subnets = JSON.parse(process.env.JOB_SUBNETS!)
				const securityGroup = process.env.JOB_SECURITY_GROUP!

				const result = await client.send(
					new RunTaskCommand({
						cluster,
						taskDefinition: name,
						launchType: 'FARGATE',
						networkConfiguration: {
							awsvpcConfiguration: {
								subnets,
								securityGroups: [securityGroup],
								assignPublicIp: 'ENABLED',
							},
						},
						overrides: {
							containerOverrides: [
								{
									name: `container-${jobName}`,
									environment: [{ name: 'PAYLOAD', value: stringify(payload) }],
								},
							],
						},
						count: 1,
					})
				)

				if (result.failures && result.failures.length > 0) {
					const { reason, detail } = result.failures[0]!
					throw new Error(`Job RunTask failed: ${reason}${detail ? ` - ${detail}` : ''}`)
				}

				return { taskArn: result.tasks?.[0]?.taskArn }
			},
		}
		return ctx[name]
	})
})
