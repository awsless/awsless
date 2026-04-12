import { runTask } from '@awsless/ecs'
import { stringify } from '@awsless/json'
import { putObject } from '@awsless/s3'
import { kebabCase } from 'change-case'
import { randomUUID } from 'crypto'
import { createProxy } from '../proxy.js'
import { APP, bindLocalResourceName } from './util.js'

export const getJobName = bindLocalResourceName('job')

export interface JobResources {}

export const Job: JobResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(jobName => {
		const name = getJobName(jobName, stackName)
		const ctx: Record<string, any> = {
			[name]: async (payload: unknown) => {
				const cluster = `${APP}-job`
				const subnets = JSON.parse(process.env.JOB_SUBNETS!)
				const securityGroup = process.env.JOB_SECURITY_GROUP!

				let storedPayload = payload
				const bucket = process.env.JOB_PAYLOAD_BUCKET
				if (payload !== undefined && bucket) {
					const key = `payloads/${randomUUID()}.json`
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
				})
			},
		}
		return ctx[name]
	})
})
