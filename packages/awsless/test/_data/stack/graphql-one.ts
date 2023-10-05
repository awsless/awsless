import { StackConfig } from "../../../src/index.js";

export const graphqlOneStack:StackConfig = {
	name: 'graphql-one',
	graphql: {
		api: {
			schema: __dirname + '/../schema/one.gql',
			resolvers: {
				Query: {
					one: __dirname + '/../function/graphql.ts',
				}
			}
		}
	},
}
