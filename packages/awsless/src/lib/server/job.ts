import { randomUUID } from 'crypto'
import { runTask } from '@awsless/ecs'
import { stringify } from '@awsless/json'
import { putObject } from '@awsless/s3'
import { kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName, getApp } from './util.js'

export const getJobName = bindLocalResourceName('job')

// Must match the cluster name the cli job feature deploys.
export const getJobClusterName = () => `${kebabCase(getApp())}-job`

export interface JobResources {}

export const Job: JobResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(jobName => {
		const name = getJobName(jobName, stackName)
		const ctx: Record<string, any> = {
			[name]: async (payload: unknown) => {
				const cluster = getJobClusterName()
				if (!process.env.JOB_SUBNETS)
					throw new Error('JOB_SUBNETS env var is not set. Is the job feature deployed?')
				if (!process.env.JOB_SECURITY_GROUP)
					throw new Error('JOB_SECURITY_GROUP env var is not set. Is the job feature deployed?')
				const subnets = JSON.parse(process.env.JOB_SUBNETS)
				const securityGroup = process.env.JOB_SECURITY_GROUP

				let storedPayload = payload
				const bucket = process.env.JOB_PAYLOAD_BUCKET
				if (payload !== undefined && bucket) {
					const key = `job/payloads/${randomUUID()}.json`
					await putObject({ bucket, key, body: stringify(payload), contentType: 'application/json' })
					storedPayload = `s3://${bucket}/${key}`
				}

				return runTask({
					cluster,
					taskDefinition: name,
					subnets,
					securityGroups: [securityGroup],
					container: `container-${kebabCase(jobName)}`,
					payload: storedPayload,
					// Jobs run in private subnets and reach the internet through the NAT gateway.
					assignPublicIp: false,
				})
			},
		}
		return ctx[name]
	})
})
