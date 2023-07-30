import { StackConfig } from "../../../src";

export const graphqlTwoStack:StackConfig = {
	name: 'graphql-other',
	graphql: {
		api: {
			schema: __dirname + '/../schema/other.gql',
			resolvers: {
				'Query get': __dirname + '/../function.ts',
			}
		}
	},
}
