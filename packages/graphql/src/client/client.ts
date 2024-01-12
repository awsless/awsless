// import { InferVariables } from './argument'
import { Fetcher } from './fetcher'
import { createQuery } from './query'
import type { InferResponse } from './response'

export type RootSchema = {
	request: any
	response: any
}

export type GraphQLSchema = {
	query: RootSchema
	mutate: RootSchema
}

export type Client<S extends GraphQLSchema> = {
	[T in keyof S]: S[T] extends RootSchema
		? <R extends S[T]['request'] & { __name?: string }>(
				request: R
		  ) => Promise<InferResponse<S[T]['response'], R>>
		: never
}
//  & {
// 	call: <Q extends QueryString>(
// 		query: Q,
// 		variables?: Record<string, unknown>
// 	) => Promise<InferResponse<S[Q['operation']]['response'], Q['request']>>
// }

export const createClient = <S extends GraphQLSchema>(fetcher: Fetcher) => {
	return {
		query(request) {
			return fetcher(createQuery('query', request))
		},
		mutate(request) {
			return fetcher(createQuery('mutation', request))
		},
	} as Client<S>
}
