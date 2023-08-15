import { StackConfig } from "../../../src";

export const graphqlTwoStack:StackConfig = {
	name: 'graphql-two',
	graphql: {
		api: {
			schema: __dirname + '/../schema/two.gql',
			resolvers: {
				'Query two': __dirname + '/../function/graphql.ts',
			}
		}
	},
}
