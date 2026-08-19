import { GraphQLError, GraphQLErrorEntry } from './error'

export type Operation = {
	query: string
	variables: { [name: string]: unknown }
}

export type Fetcher = (opt: Operation, props?: FetchProps) => unknown

export type FetcherOptions = {
	url: string
	headers?: Record<string, string>
}

export type FetchProps = {
	fetch?: typeof fetch
	headers?: Record<string, string>
	signal?: AbortSignal
}

export const createFetcher = (
	optionsOrFunc: FetcherOptions | (() => FetcherOptions | Promise<FetcherOptions>)
): Fetcher => {
	return async (operation, props = {}) => {
		const options = typeof optionsOrFunc === 'function' ? await optionsOrFunc() : optionsOrFunc
		const mime = 'application/json'

		const response = await (props?.fetch ?? fetch)(options.url, {
			method: 'POST',
			headers: {
				accept: mime,
				'content-type': mime,
				...(options.headers ?? {}),
				...(props.headers ?? {}),
			},
			body: JSON.stringify(operation),
			signal: props.signal,
		})

		const result = (await response.json()) as {
			data?: unknown
			errors?: GraphQLErrorEntry[]
		}

		if (result.errors && result.errors.length > 0) {
			throw new GraphQLError(result.errors)
		}

		return result.data
	}
}
