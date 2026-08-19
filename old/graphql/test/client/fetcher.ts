import { GraphQLError } from '../../src/client/error'
import { createFetcher } from '../../src/client/fetcher'

describe('fetcher', () => {
	const url = 'https://example.com/graphql'

	const body = {
		query: 'query {id}',
		variables: { arg: 1 },
	}

	const fetcher = createFetcher({
		url,
		headers: {
			auth: 'token',
		},
	})

	it('should respond with a graphql data response', async () => {
		const fetch = vi.fn().mockReturnValue(
			new Response(
				JSON.stringify({
					data: { id: 1 },
				})
			)
		)

		const result = await fetcher(body, {
			fetch,
			headers: {
				'request-id': '1',
			},
		})

		expect(fetch).toBeCalledWith(url, {
			body: JSON.stringify(body),
			method: 'POST',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
				// custom headers
				auth: 'token',
				'request-id': '1',
			},
		})

		expect(result).toStrictEqual({
			id: 1,
		})
	})

	it('should throw a graphql error response', async () => {
		const fetch = vi.fn().mockReturnValue(
			new Response(
				JSON.stringify({
					errors: [
						{
							path: null,
							message: 'Random error',
						},
					],
				})
			)
		)

		await expect(
			fetcher(body, {
				fetch,
				headers: {
					'request-id': '1',
				},
			})
		).rejects.toThrow(GraphQLError)
	})
})
