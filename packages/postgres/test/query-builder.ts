import {
	BeginTransactionCommand,
	CommitTransactionCommand,
	ExecuteStatementCommand,
	RDSDataClient,
	RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data'
import { BigFloat } from '@awsless/big-float'
import { PostgresServer } from '@awsless/postgres-server'
import { mockClient } from 'aws-sdk-vitest-mock'
import {
	postgresClient,
	postgresDataClient,
	postgresQueryBuilder,
	sql,
	type PostgresClient,
	type PostgresColumn,
	type PostgresGenerated,
} from '../src'
import { fakeDataApi } from '../src/fake-data-api'

type Tables = {
	prices: {
		id: number
		amount: PostgresColumn<BigFloat, BigFloat | string | number, BigFloat | string | number>
		history: PostgresColumn<BigFloat[], (BigFloat | string | number)[] | undefined, (BigFloat | string | number)[]>
		details: PostgresColumn<
			unknown,
			string | { [key: string]: unknown } | null,
			string | { [key: string]: unknown } | null
		>
	}
	notes: {
		id: PostgresGenerated<number>
		body: string
		tags: string[]
		created_at: PostgresGenerated<Date>
	}
}

describe('postgresQueryBuilder', () => {
	const server = new PostgresServer()
	let direct: PostgresClient
	let api: ReturnType<typeof fakeDataApi>

	beforeAll(async () => {
		await server.listen()

		// A stand-in for the Data API on the same local server.
		api = fakeDataApi({ url: server.url.replace(/\/postgres$/, '') })

		const rds = mockClient(RDSDataClient)

		rds.on(BeginTransactionCommand).callsFake(input => api.send(new BeginTransactionCommand(input)))
		rds.on(ExecuteStatementCommand).callsFake(input => api.send(new ExecuteStatementCommand(input)))
		rds.on(CommitTransactionCommand).callsFake(input => api.send(new CommitTransactionCommand(input)))
		rds.on(RollbackTransactionCommand).callsFake(input => api.send(new RollbackTransactionCommand(input)))
		direct = postgresClient({ url: server.url, strict: true })
		await direct.query(
			`CREATE TABLE prices (id int PRIMARY KEY, amount numeric NOT NULL, history numeric[] NOT NULL DEFAULT '{}', details jsonb)`
		)
		await direct.query(
			`CREATE TABLE notes (
				id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
				body text NOT NULL,
				tags text[] NOT NULL,
				created_at timestamptz NOT NULL DEFAULT now()
			)`
		)
	})

	afterAll(async () => {
		await direct.close()
		await api.close()
		await server.close()
	})

	const transports = {
		'a connection': () => direct,
		'the Data API': () => {
			return postgresDataClient({
				clusterArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:app-postgres',
				secretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b',
				database: 'postgres',
			})
		},
	}

	describe.each(Object.entries(transports))('over %s', (_, createClient) => {
		let client: PostgresClient
		let db: ReturnType<typeof postgresQueryBuilder<Tables>>

		beforeAll(() => {
			client = createClient()
			db = postgresQueryBuilder<Tables>({ client: () => client })
		})

		beforeEach(async () => {
			await direct.query('TRUNCATE notes RESTART IDENTITY')
		})

		it('inserts, selects, updates & deletes with typed rows', async () => {
			const inserted = await db
				.insertInto('notes')
				.values([
					{ body: "it's", tags: ['a', 'b'] },
					{ body: 'second', tags: [] },
				])
				.returning(['id', 'created_at'])
				.execute()

			expect(inserted.map(row => row.id)).toEqual([1, 2])
			expect(inserted[0]!.created_at).toBeInstanceOf(Date)

			const rows = await db
				.selectFrom('notes')
				.select(['id', 'body', 'tags'])
				.where('id', 'in', [1, 2])
				.orderBy('id')
				.limit(10)
				.execute()

			expect(rows).toEqual([
				{ id: 1, body: "it's", tags: ['a', 'b'] },
				{ id: 2, body: 'second', tags: [] },
			])

			const updated = await db
				.updateTable('notes')
				.set({ body: 'changed' })
				.where('id', '=', 2)
				.executeTakeFirst()
			const deleted = await db.deleteFrom('notes').executeTakeFirst()

			expect(updated.numUpdatedRows).toBe(1n)
			expect(deleted.numDeletedRows).toBe(2n)
		})

		it('runs raw sql with a typed result', async () => {
			await db
				.insertInto('notes')
				.values({ body: 'one', tags: ['x'] })
				.execute()

			const { rows } = await sql<{
				total: number
			}>`SELECT count(*)::int AS total FROM notes WHERE body = ${'one'}`.execute(db)

			expect(rows).toEqual([{ total: 1 }])
		})

		it('commits a transaction, and rolls one back that throws', async () => {
			await db.transaction().execute(async transaction => {
				await transaction.insertInto('notes').values({ body: 'kept', tags: [] }).execute()
				await transaction.updateTable('notes').set({ body: 'kept twice' }).where('body', '=', 'kept').execute()
			})

			await expect(
				db.transaction().execute(async transaction => {
					await transaction.insertInto('notes').values({ body: 'lost', tags: [] }).execute()

					throw new Error('stop')
				})
			).rejects.toThrow('stop')

			expect(await db.selectFrom('notes').select('body').execute()).toEqual([{ body: 'kept twice' }])
		})

		it('reads & writes a numeric as a BigFloat, with every digit', async () => {
			const price = new BigFloat('123456789012345678901234567890.123456789012345678901234567890')

			await direct.query('TRUNCATE prices')
			await db
				.insertInto('prices')
				.values({ id: 1, amount: price, history: [new BigFloat('1.5'), price] })
				.execute()

			const [row] = await db.selectFrom('prices').select(['amount', 'history']).execute()
			const [queried] = await client.query<{ amount: BigFloat; total: BigFloat }>(
				'SELECT amount, amount + $1 AS total FROM prices WHERE amount = $2',
				[new BigFloat('0.5'), price]
			)

			expect(row!.amount).toBeInstanceOf(BigFloat)
			expect(row!.amount.toString()).toBe(price.toString())
			expect(row!.history.map(String)).toEqual(['1.5', price.toString()])
			expect(queried!.total.toString()).toBe('123456789012345678901234567890.62345678901234567890123456789')
		})

		it('says so for a numeric that is no number', async () => {
			await expect(client.query("SELECT 'NaN'::numeric AS amount")).rejects.toThrow(
				"A numeric of NaN can't be read as a BigFloat. Cast it to text in the query, like amount::text."
			)
			expect(await client.query("SELECT 'NaN'::numeric::text AS amount")).toEqual([{ amount: 'NaN' }])
		})

		it('keeps what a json document holds: a BigFloat, a Date, a Set', async () => {
			const details = {
				price: new BigFloat('0.1'),
				at: new Date('2026-11-18T10:00:00.000Z'),
				tags: new Set(['a', 'b']),
				plain: { list: [1, 'two', null] },
			}

			await direct.query('TRUNCATE prices')
			await db.insertInto('prices').values({ id: 1, amount: 1, details }).execute()
			await client.query('INSERT INTO prices (id, amount, details) VALUES (2, 2, $1)', [details])

			const rows = await db.selectFrom('prices').select('details').orderBy('id').execute()
			const [queried] = await client.query<{ details: typeof details }>('SELECT details FROM prices WHERE id = 2')

			expect(rows).toEqual([{ details }, { details }])
			expect(queried!.details.price).toBeInstanceOf(BigFloat)
			expect(queried!.details.at).toBeInstanceOf(Date)
			expect(queried!.details.tags).toBeInstanceOf(Set)

			// A document written as plain json reads the way it was.
			await direct.query(`UPDATE prices SET details = '{"at":"2026-11-18","list":[1.5]}' WHERE id = 1`)

			expect(await client.query('SELECT details FROM prices WHERE id = 1')).toEqual([
				{ details: { at: '2026-11-18', list: [1.5] } },
			])
		})

		it('wraps every statement', async () => {
			const wrapped: string[] = []
			const traced = postgresQueryBuilder<Tables>({
				client: () => client,
				wrap: async run => {
					wrapped.push('statement')

					return run()
				},
			})

			await traced.selectFrom('notes').selectAll().execute()

			expect(wrapped).toEqual(['statement'])
		})
	})
})
