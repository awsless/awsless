import { command, mockMysql } from '../src'
import { UUID, randomUUID } from 'crypto'
import { join } from 'path'

describe('MySQL Mock', () => {
	mockMysql({
		migrations: {
			test: join(__dirname, '_migrations'),
		},
	})

	interface User {
		id: UUID
		name: string
	}

	interface Database {
		users: User
	}

	it('should get and set data in mysql', async () => {
		const id = randomUUID()

		const hoi = await command<Database, User | undefined>({ database: 'test' }, async client => {
			await client.insertInto('users').values({ id, name: 'Jack' }).executeTakeFirst()
			return await client.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst()
		})

		expect(hoi).toStrictEqual({ id, name: 'Jack' })
	})
})
