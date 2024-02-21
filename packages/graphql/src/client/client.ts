import { FetchProps, Fetcher } from './fetcher'
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
				request: R,
				props?: FetchProps
		  ) => Promise<InferResponse<S[T]['response'], R>>
		: never
}

export const createClient = <S extends GraphQLSchema>(fetcher: Fetcher) => {
	return {
		query(request, props) {
			return fetcher(createQuery('query', request), props)
		},
		mutate(request, props) {
			return fetcher(createQuery('mutation', request), props)
		},
	} as Client<S>
}
