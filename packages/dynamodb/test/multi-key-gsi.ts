import { randomUUID } from 'crypto'
import { date, define, mockDynamoDB, object, putItem, query, string, uuid } from '../src'

describe('multi key GSI', () => {
	const table = define('table', {
		hash: 'id',
		schema: object({
			id: uuid(),
			slug: string(),
			title: string(),
			createdAt: date(),
		}),
		indexes: {
			hash: {
				hash: ['id', 'title'],
			},
			sort: {
				hash: 'id',
				sort: ['slug', 'createdAt'],
			},
			both: {
				hash: ['id', 'title'],
				sort: ['slug', 'createdAt'],
			},
		},
	})

	mockDynamoDB({
		tables: [table],
		// engine: 'correctness',
	})

	const id = randomUUID()
	const title = 'title'
	const slug = 'slug'
	const createdAt = new Date()

	it('setup', async () => {
		await putItem(table, {
			id,
			slug,
			title,
			createdAt,
		})
	})

	it('multi hash key query', async () => {
		await query(
			table,
			{
				id,
				title,
			},
			{
				index: 'hash',
			}
		)
	})

	it('multi sort key query', async () => {
		await query(
			table,
			{
				id,
			},
			{
				index: 'sort',
				where: e => [
					//
					e.slug.eq(slug),
					e.createdAt.gt(new Date()),
				],
			}
		)
	})

	it('multi sort key query with the sort keys in the key', async () => {
		const result = await query(
			table,
			{
				id,
				slug,
				createdAt,
			},
			{
				index: 'sort',
			}
		)

		expect(result.items).toHaveLength(1)
	})

	it('multi hash & sort key query', async () => {
		await query(
			table,
			{
				id,
				title,
			},
			{
				index: 'both',
				where: e => [
					//
					e.slug.eq(slug),
					e.createdAt.gt(new Date()),
				],
			}
		)
	})
})
