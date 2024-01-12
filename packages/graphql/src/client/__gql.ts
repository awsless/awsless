// export type Client<S extends GraphQLSchema> = {
// 	[T in keyof S]: S[T] extends RootSchema
// 		? <R extends S[T]['request'] & { __name?: string }>(request: R) => Promise<Select<S[T]['response'], R>>
// 		: never
// }

// import { Select } from './response'

// export type RootSchema = {
// 	request: any
// 	response: any
// }

// export type GraphQLSchema = {
// 	query?: RootSchema
// 	mutate?: RootSchema
// }

// export type InferInput = {}

// class GQL<S extends GraphQLSchema, T extends keyof S, R extends S[T]['request']> {}

// export const createGql = <S extends GraphQLSchema, T extends keyof S>(
// 	type: T,
// 	request: S[T] extends RootSchema ? S[T]['request'] :
// ): Select<S[T]['response'], R> => {
// 	return new GQL()
// }

// export const createQuery = (gql) => {
// 	return createGql('query', gql)
// }

// const query = client.createQuery({
// 	account: [{
// 		name: [ 'name', 'String' ],
// 		limit: [ 'limit', 'Int!' ],
// 		// name: $('name', 'String'),
// 		// limit: $('limit', 'Int!'),
// 	}, {
// 		id: true
// 	}]
// })

// await client.send(query, {
// 	name: 'user'
// })

// const chain = createChain<Schema>()
// chain(query).send({

// })
