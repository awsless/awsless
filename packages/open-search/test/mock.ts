import { BigFloat } from '@awsless/big-float'
import { randomUUID } from 'crypto'
import {
	array,
	bigfloat,
	bigint,
	boolean,
	createIndex,
	date,
	define,
	deleteIndex,
	deleteItem,
	indexItem,
	mockOpenSearch,
	number,
	object,
	search,
	searchClient,
	set,
	string,
	updateItem,
	uuid,
} from '../src'

describe('Open Search Mock', () => {
	mockOpenSearch()

	const id = randomUUID()
	const createdAt = new Date()

	const users = define(
		'users',
		object({
			id: uuid(),
			name: string({
				type: 'text',
				fields: {
					sort: {
						type: 'keyword',
					},
				},
			}),
			type: string<'foo' | 'bar'>(),
			enabled: boolean(),
			likes: bigint(),
			balance: bigfloat(),
			tags: set(string()),
			links: array(number()),
			createdAt: date(),
			data: object({
				number: number(),
			}),
		}),
		searchClient
	)

	it('should create index', async () => {
		await createIndex(users)
	})

	it('should index item', async () => {
		await indexItem(users, '1', {
			id,
			name: 'jacksclub',
			type: 'bar',
			enabled: true,
			likes: 10n,
			balance: new BigFloat(1),
			tags: new Set(['tag']),
			links: [1],
			createdAt,
			data: {
				number: 1,
			},
		})
	})

	it('should update item', async () => {
		await updateItem(users, '1', {
			id,
			enabled: false,
		})
	})

	it('should search', async () => {
		const result = await search(users, {
			query: {
				bool: {
					must: {
						query_string: {
							query: 'jacksclub~',
							fuzziness: 'AUTO',
							fuzzy_transpositions: true,
							allow_leading_wildcard: true,
							fields: ['name'],
						},
					},
				},
			},
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			found: 1,
			count: 1,
			items: [
				{
					id,
					type: 'bar',
					name: 'jacksclub',
					enabled: false,
					likes: 10n,
					balance: new BigFloat(1),
					tags: new Set(['tag']),
					links: [1],
					createdAt,
					data: {
						number: 1,
					},
				},
			],
		})
	})

	// it('should query items', async () => {
	// 	const result = await query(users, {
	// 		query: `SELECT * FROM users`,
	// 	})

	// 	expect(result).toStrictEqual({
	// 		found: 1,
	// 		count: 1,
	// 		items: [
	// 			{
	// 				id,
	// 				type: 'bar',
	// 				name: 'jacksclub',
	// 				enabled: true,
	// 				likes: 10n,
	// 				balance: new BigFloat(1),
	// 				tags: new Set(['tag']),
	// 				links: [1],
	// 				createdAt,
	// 				data: {
	// 					number: 1,
	// 				},
	// 			},
	// 		],
	// 	})
	// })

	it('should delete item', async () => {
		await deleteItem(users, '1')

		const result = await search(users, {
			query: {
				bool: {
					must: {
						query_string: {
							query: 'jacksclub~',
							fuzziness: 'AUTO',
							fuzzy_transpositions: true,
							allow_leading_wildcard: true,
							fields: ['name'],
						},
					},
				},
			},
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			found: 0,
			count: 0,
			items: [],
		})
	})

	it('should delete index', async () => {
		await deleteIndex(users)
	})
})
