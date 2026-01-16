import { randomUUID, UUID } from 'crypto'
import { define, getItem, Infer, mockDynamoDB, object, putItem, string, updateItem, uuid } from '../../src'
import { Brand, brand, toBranded } from '../../src/schema/__brand'

describe('brand', () => {
	const blog = define('blog', {
		hash: 'id',
		schema: object({
			id: uuid(),
			title: brand(string(), 'title'),
			intro: brand(string(), 'intro'),
			content: brand(string(), 'content'),
		}),
	})

	mockDynamoDB({ tables: [blog] })

	const id = randomUUID()

	const item: Infer<typeof blog> = {
		id,
		title: toBranded('title', 'title'),
		intro: toBranded('Hello', 'intro'),
		content: toBranded('Hi there', 'content'),
	}

	it('put', async () => {
		await putItem(blog, item)
	})

	it('get', async () => {
		const result = await getItem(blog, { id })

		expectTypeOf(result).toEqualTypeOf<
			| undefined
			| {
					id: UUID
					title: Brand<string, 'title'>
					intro: Brand<string, 'intro'>
					content: Brand<string, 'content'>
			  }
		>()

		expect(result).toStrictEqual(item)
	})

	it('update', async () => {
		const result = await updateItem(
			blog,
			{ id },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.title.set(toBranded('other', 'title')),
				],
				when: e => [
					//
					e.title.eq(toBranded('title', 'title')),
				],
			}
		)

		expect(result).toStrictEqual({
			id,
			title: 'other',
			intro: 'intro',
			content: 'content',
		})
	})
})
