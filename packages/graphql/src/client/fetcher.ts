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

		const data = await response.json()

		return data
	}
}
