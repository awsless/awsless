import { StackConfig } from "../../../src";

export const graphqlOneStack:StackConfig = {
	name: 'graphql-one',
	graphql: {
		api: {
			schema: __dirname + '/../schema/one.gql',
			resolvers: {
				'Query one': __dirname + '/../function/graphql.ts',
			}
		}
	},
}
