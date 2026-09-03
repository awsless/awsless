import { Duration, seconds, toMilliSeconds } from '@awsless/duration'

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
} & (Params extends R['param'] ? { params?: Params } : { params: R['param'] }) &
	(Query extends R['query'] ? { query?: Query } : { query: R['query'] }) &
	(undefined extends R['body'] ? { body?: Body } : { body: R['body'] })

export type HttpFetcher = (props: {
	method: Method
	path: Path
	headers: Headers
	query?: Query
	body?: Body
}) => unknown

export class HttpError extends Error {
	constructor(
		readonly status: number,
		readonly body: string,
		readonly url: string
	) {
		super(`HTTP ${status} from ${url}: ${body.slice(0, 500)}`)
		this.name = 'HttpError'
	}
}

export type HttpFetcherOptions = {
	// Without one a hung upstream holds the caller until its own timeout.
	timeout?: Duration
}

export const createHttpFetcher = (host: string, options: HttpFetcherOptions = {}): HttpFetcher => {
	const timeout = toMilliSeconds(options.timeout ?? seconds(30))

	return async ({ method, path, headers, body, query }) => {
		const url = new URL(path, host)

		if (query) {
			for (const [key, value] of Object.entries(query)) {
				url.searchParams.set(key, value)
			}
		}

		headers.set('content-type', 'application/json')
		const payload = body === undefined ? undefined : JSON.stringify(body)

		if (method === 'POST') {
			const bytes = new TextEncoder().encode(payload ?? '')
			const hash = await crypto.subtle.digest('SHA-256', bytes)

			headers.set(
				'x-amz-content-sha256',
				Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
			)
		}

		const response = await fetch(url, {
			method,
			headers,
			...(method === 'GET' ? {} : { body: payload }),
			signal: AbortSignal.timeout(timeout),
		})

		// A non-2xx body is rarely json, so reading it as text keeps the status
		// & the real message instead of failing inside json parsing.
		if (!response.ok) {
			throw new HttpError(response.status, await response.text().catch(() => ''), url.toString())
		}

		return await response.json()
	}
}

export const createHttpClient = <S extends Schema>(fetcher: HttpFetcher) => {
	const fetch = <M extends keyof S, P extends keyof S[M]>(
		method: M,
		routeKey: Extract<P, string>,
		props?: Props<GetRoute<S, M, P>>
	) => {
		const path = routeKey.replaceAll(/{([a-z0-9-]+)}/g, key => {
			return encodeURIComponent(props?.params?.[key.substring(1, key.length - 1)]?.toString() ?? '')
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
