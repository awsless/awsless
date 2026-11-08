import { object, searchClient, string } from '@awsless/open-search'
import { mockTraceDaemon } from '@awsless/utils'
import { assertMatchingMappings, formatSearchIndexName, Search } from '../src/lib/server/search'

describe('search', () => {
	it('formats the index name like the cli', () => {
		expect(formatSearchIndexName('MyStack', 'products')).toBe('my-stack--products')
	})

	const declared = {
		properties: {
			name: { type: 'keyword' },
			price: { type: 'long' },
			owner: { properties: { id: { type: 'keyword' } } },
		},
	}

	it('accepts matching & interchangeable mappings', () => {
		const defined = {
			properties: {
				name: { type: 'text' },
				price: { type: 'double' },
				owner: { properties: { id: { type: 'keyword' } } },
			},
		}

		expect(() => assertMatchingMappings('stack.items', declared, defined)).not.toThrow()
	})

	it('rejects fields missing on either side', () => {
		expect(() =>
			assertMatchingMappings('stack.items', declared, {
				properties: { ...declared.properties, extra: { type: 'keyword' } },
			})
		).toThrow('defines the field "extra", which the stack file doesn\'t declare')

		const { price: _, ...rest } = declared.properties
		expect(() => assertMatchingMappings('stack.items', declared, { properties: rest })).toThrow(
			'declares the field "price" for search index "stack.items", which the code schema doesn\'t define'
		)
	})

	it('rejects incompatible types & nested shape mismatches', () => {
		expect(() =>
			assertMatchingMappings('stack.items', declared, {
				properties: { ...declared.properties, price: { type: 'keyword' } },
			})
		).toThrow('is a "keyword" in the code schema but a "long" in the stack file')

		expect(() =>
			assertMatchingMappings('stack.items', declared, {
				properties: { ...declared.properties, owner: { type: 'keyword' } },
			})
		).toThrow('"owner" of search index "stack.items" is an object on one side but not the other')

		expect(() =>
			assertMatchingMappings('stack.items', declared, {
				properties: { ...declared.properties, owner: { properties: { id: { type: 'long' } } } },
			})
		).toThrow('The field "owner.id"')
	})

	it('spans each request by its index, method and endpoint alone', async () => {
		const daemon = await mockTraceDaemon()
		vi.stubEnv('APP', 'test-app')
		vi.stubEnv('AWS_REGION', 'eu-west-1')
		vi.stubEnv('AWS_ACCESS_KEY_ID', 'test')
		vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test')
		vi.stubEnv('SEARCH_ENDPOINT', 'http://127.0.0.1:1')

		// The base transport every client's signing transport extends, answering
		// in the search server's place.
		const notFound = Object.assign(new Error('document user-1042@example.com is missing'), {
			name: 'ResponseError',
			meta: { statusCode: 404 },
		})
		const signingTransport = Object.getPrototypeOf(searchClient({ node: 'http://127.0.0.1:1' }).transport)
		// Answers the callback form too, which the signing transport calls itself with.
		vi.spyOn(Object.getPrototypeOf(signingTransport), 'request').mockImplementation(
			(params: unknown, _options?: unknown, callback?: unknown) => {
				const answer = (params as { path: string }).path.includes('_doc')
					? Promise.reject(notFound)
					: Promise.resolve({ statusCode: 200, body: {} })

				if (typeof callback === 'function') {
					answer.then(
						result => callback(null, result),
						error => callback(error)
					)
					return
				}

				return answer
			}
		)

		const users = (Search as any).stack.users
		const client = users.define(object({ name: string() })).client()

		await client.search({ index: users.name, body: { query: { match: { name: 'user-1042@example.com' } } } })
		await expect(client.get({ index: users.name, id: 'user-1042@example.com' })).rejects.toBe(notFound)

		const [search, get] = await daemon.received(2)
		daemon.close()
		vi.unstubAllEnvs()
		vi.restoreAllMocks()

		expect(search).toMatchObject({
			name: 'OpenSearch',
			namespace: 'remote',
			annotations: { search_operation: '_search' },
			metadata: { default: { index: users.name } },
			http: { request: { method: 'POST' }, response: { status: 200 } },
		})
		expect(get).toMatchObject({
			annotations: { search_operation: '_doc' },
			error: true,
			http: { response: { status: 404 } },
			cause: { exceptions: [{ type: 'ResponseError' }] },
		})
		expect(get).not.toHaveProperty('fault')
		expect(JSON.stringify([search, get])).not.toContain('example.com')
	})
})
