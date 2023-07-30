import { StackConfig } from "../../../src";

export const graphqlOneStack:StackConfig = {
	name: 'graphql',
	graphql: {
		api: {
			schema: __dirname + '/../schema/schema.gql',
			resolvers: {
				'Query list': __dirname + '/../function.ts',
			}
		}
	},
}
