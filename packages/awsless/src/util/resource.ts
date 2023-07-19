import { Arn, Stack } from "aws-cdk-lib"
import { Function } from "aws-cdk-lib/aws-lambda"
import { constantCase, paramCase, pascalCase } from "change-case"
import { Config } from "../config"

export type ResourceType = 'function' | 'topic' | 'table' | 'store' | 'queue' | 'cron'

export const toId = (resource: ResourceType, id: string) => {
	return pascalCase(`${resource}-${id}`)
}

export const toName = (stack: Stack, id: string) => {
	return paramCase(`${stack.stackName}-${id}`)
}

// export const toResourceName = (config:Config, stack: Stack, id: string) => {
// 	return paramCase(`${config.name}-${config.stage}-${stack.artifactId}-${id}`)
// }

export const toEnvKey = (resource: ResourceType, id: string) => {
	return constantCase(`RESOURCE_${resource}_${id}`)
}

export const toArn = (stack: Stack, service: 'sns', resource: 'topic', id: string) => {
	return Arn.format({
		service,
		resource,
		resourceName: toName(stack, id)
	}, stack)
}

export const toBucketName = (config: Config, id: string) => {
	return paramCase(`${config.name}-${config.account}-${id}`)
}

export const addResourceEnvironment = (stack: Stack, resource: ResourceType, id: string, lambda: Function) => {
	const key = toEnvKey(resource, id)
	const value = toName(stack, id)

	lambda.addEnvironment(key, value, {
		removeInEdge: true
	})
}
