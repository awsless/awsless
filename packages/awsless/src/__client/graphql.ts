import { constantCase } from 'change-case'
import { createProxy } from '../node/util.js'
import { getEnv } from './env.js'

export const getGraphqlEndpoint = (name: string) => {
	const id = constantCase(name)

	return getEnv(`GRAPHQL_${id}_ENDPOINT`)!
}

export interface GraphQLResources {}

export const GraphQL: GraphQLResources = /*@__PURE__*/ createProxy(name => {
	return getGraphqlEndpoint(name)
})
