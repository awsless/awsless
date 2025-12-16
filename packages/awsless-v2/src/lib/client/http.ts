export interface HTTP {}

type Method = 'GET' | 'POST'
type Path = string
type Params = Record<string, string | number>
type Query = Record<string, string>
type Body = unknown

type Route = {
	param?: Params
	query?: Query
	body?: Body
	response: unknown
}

type Routes = Record<Path, Route>
type Schema = Partial<Record<Method, Routes>>

type GetRoute<S extends Schema, M extends keyof S, P extends keyof S[M]> = S[M] extends Routes ? S[M][P] : never

type Props<R extends Route> = {
	headers?: Record<string, string>
	params?: R['param'] extends Params ? R['param'] : never
	query?: R['query'] extends Query ? R['query'] : never
	body?: R['body'] extends Body ? R['body'] : never
}

export type HttpFetcher = (props: {
	method: Method
	path: Path
	headers: Headers
	query?: Query
	body?: Body
}) => unknown

export const createHttpFetcher = (host: string): HttpFetcher => {
	return async ({ method, path, headers, body, query }) => {
		const url = new URL(host, path)

		if (query) {
			for (const [key, value] of Object.entries(query)) {
				url.searchParams.set(key, value)
			}
		}

		headers.set('content-type', 'application/json')

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		})

		const result = await response.json()

		return result
	}
}

export const createHttpClient = <S extends Schema>(fetcher: HttpFetcher) => {
	const fetch = <M extends keyof S, P extends keyof S[M]>(
		method: M,
		routeKey: Extract<P, string>,
		props?: Props<GetRoute<S, M, P>>
	) => {
		const path = routeKey.replaceAll(/{([a-z0-1-]+)}/, key => {
			return props?.params?.[key.substring(1, key.length - 1)]?.toString() ?? ''
		})

		return fetcher({
			headers: new Headers(props?.headers),
			query: props?.query,
			body: props?.body,
			method: method as Method,
			path,
		}) as Promise<GetRoute<S, M, P>['response']>
	}

	return {
		fetch,
		get<P extends keyof S['GET']>(routeKey: Extract<P, string>, props?: Props<GetRoute<S, 'GET', P>>) {
			return fetch('GET', routeKey, props)
		},
		post<P extends keyof S['POST']>(routeKey: Extract<P, string>, props?: Props<GetRoute<S, 'POST', P>>) {
			return fetch('POST', routeKey, props)
		},
	}
}

// export class HttpClient<S extends Schema> {
// 	constructor(private fetcher: HttpFetcher) {}

// 	fetch<M extends keyof S, P extends keyof S[M]>(
// 		method: M,
// 		routeKey: Extract<P, string>,
// 		props?: Props<GetRoute<S, M, P>>
// 	) {
// 		const path = routeKey.replaceAll(/{([a-z0-1-]+)}/, key => {
// 			return props?.params?.[key.substring(1, key.length - 1)].toString() ?? ''
// 		})

// 		return this.fetcher({
// 			headers: new Headers(props?.headers),
// 			query: props?.query,
// 			body: props?.body,
// 			method: method as Method,
// 			path,
// 		}) as Promise<GetRoute<S, M, P>['response']>
// 	}

// 	get<P extends keyof S['GET']>(routeKey: Extract<P, string>, props?: Props<GetRoute<S, 'GET', P>>) {
// 		return this.fetch('GET', routeKey, props)
// 	}

// 	post<P extends keyof S['POST']>(routeKey: Extract<P, string>, props?: Props<GetRoute<S, 'POST', P>>) {
// 		return this.fetch('POST', routeKey, props)
// 	}
// }

// const http = createHttpClient<{
// 	GET: {
// 		'/dice': {
// 			response: string
// 		}
// 	}
// 	POST: {
// 		'/blaze/{id}': {
// 			param: {
// 				id: string | number
// 			}
// 			response: number
// 		}
// 	}
// }>(createHttpFetcher('https://api.com'))

// const response = await http.get('/dice')
// const response2 = await http.post('/blaze/{id}', { params: { id: 1 } })
// const response3 = await http.post('/blaze/{id}', { params: { id: 2 } })

// const result = await http.fetch('GET', '/dice')
// result.at(0)

// type Reduce<T> = T extends { response: any } ? T['response'] : never
// type Obj = Reduce<{ response: string } | { other: number }>
