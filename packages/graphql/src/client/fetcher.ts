import { GraphQLError, GraphQLErrorEntry } from './error'

export type Operation = {
	query: string
	variables: { [name: string]: unknown }
}

export type Fetcher = (opt: Operation) => unknown

export type FetcherProps = {
	url: string
	headers?: Record<string, string>
}

export const createFetcher = (
	propsOrFunc: FetcherProps | (() => FetcherProps | Promise<FetcherProps>)
): Fetcher => {
	return async operation => {
		const props = typeof propsOrFunc === 'function' ? await propsOrFunc() : propsOrFunc
		const mime = 'application/json'

		const response = await fetch(props.url, {
			method: 'POST',
			headers: {
				accept: mime,
				'content-type': mime,
				...(props.headers ?? {}),
			},
			body: JSON.stringify(operation),
		})

		const result = (await response.json()) as {
			data?: unknown
			errors?: GraphQLErrorEntry[]
		}

		if (result.errors && result.errors.length > 1) {
			throw new GraphQLError(result.errors)
		}

		return result.data
	}
}
