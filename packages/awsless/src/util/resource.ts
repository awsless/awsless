import { Stack } from "aws-cdk-lib"
import { Function } from "aws-cdk-lib/aws-lambda"
import { constantCase, paramCase, pascalCase } from "change-case"
import { Config } from '../config.js'

// export type ResourceType = 'function' | 'topic' | 'table' | 'store' | 'queue' | 'cron' | 'search' | 'graphql' | 'schema' | 'data-source' | 'resolver' | 'output'

export const toId = (resource: string, id: string) => {
	return pascalCase(`${resource}-${id}`)
}

export const toName = (stack: Stack, id: string) => {
	return paramCase(`${stack.stackName}-${id}`)
}

// export const toResourceName = (config:Config, stack: Stack, id: string) => {
// 	return paramCase(`${config.name}-${config.stage}-${stack.artifactId}-${id}`)
// }

export const toEnvKey = (resource: string, id: string) => {
	return `RESOURCE_${resource.toUpperCase()}_${id}`
}


export const toBucketName = (config: Config, id: string) => {
	return paramCase(`${config.name}-${config.account}-${id}`)
}

export const addResourceEnvironment = (stack: Stack, resource: string, id: string, lambda: Function) => {
	const key = toEnvKey(resource, id)
	const value = toName(stack, id)

	lambda.addEnvironment(key, value, {
		removeInEdge: true
	})
}
