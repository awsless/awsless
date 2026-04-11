import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { getBindEnv } from './util.js'

export interface GraphQLSchema {}

export interface GraphQLResources {}

export const GraphQL: GraphQLResources = /*@__PURE__*/ createProxy(name => {
	return getGraphQLProps(name)
})

export const getGraphQLProps = (name: string) => {
	const id = constantCase(name)

	return {
		endpoint: getBindEnv(`GRAPHQL_${id}_ENDPOINT`)!,
	}
}
