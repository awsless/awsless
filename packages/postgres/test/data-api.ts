import {
	BeginTransactionCommand,
	CommitTransactionCommand,
	ExecuteStatementCommand,
	RDSDataClient,
	RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data'
import { mockClient } from 'aws-sdk-vitest-mock'
import { getSqlState, postgresDataClient, PostgresError } from '../src'
import { transact } from '../src/transport'

const clusterArn = 'arn:aws:rds:eu-west-1:123456789012:cluster:app-postgres'
const secretArn = 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b'
const target = { resourceArn: clusterArn, secretArn, database: 'link' }

const serviceError = (name: string, message: string) => Object.assign(new Error(message), { name })
const resuming = () => {
	return serviceError(
		'DatabaseResumingException',
		'The Aurora DB instance app-postgres is resuming after being auto-paused. Please wait a few seconds and try again.'
	)
}

describe('postgresDataClient', () => {
	const api = mockClient(RDSDataClient)
	const client = postgresDataClient({ clusterArn, secretArn, database: 'link' })

	// The inputs of the calls made, by command name, in order.
	const calls = (): Record<string, any>[] => {
		return api.calls().map(command => ({ [command.constructor.name]: command.input }))
	}

	// Runs the timers until the promise is done, however long it sleeps.
	const settle = async <T>(promise: Promise<T>) => {
		let done = false
		const result = promise.finally(() => {
			done = true
		})

		result.catch(() => {})

		while (!done) {
			await vi.advanceTimersByTimeAsync(1000)
		}

		return result
	}

	beforeEach(() => {
		api.reset()
		vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('a query', () => {
		it('is one ExecuteStatement call, its values written into the sql', async () => {
			api.on(ExecuteStatementCommand).resolves({ columnMetadata: [], records: [] })

			expect(await client.query('UPDATE links SET seen = $2 WHERE project_id = $1', ['6f1c', 3])).toEqual([])
			expect(calls()).toEqual([
				{
					ExecuteStatementCommand: {
						...target,
						sql: "UPDATE links SET seen = '3' WHERE project_id = '6f1c'",
						parameters: undefined,
						transactionId: undefined,
						continueAfterTimeout: undefined,
						includeResultMetadata: true,
						resultSetOptions: { longReturnType: 'STRING', decimalReturnType: 'STRING' },
					},
				},
			])
		})

		it('sends a value that the sql casts as a text parameter', async () => {
			api.on(ExecuteStatementCommand).resolves({})

			await client.query('SELECT link($1, $2::jsonb, $3::text[], $4::jsonb)', [
				'6f1c',
				'[{"a":1}]',
				['a', 'b'],
				null,
			])

			expect(calls()[0]!.ExecuteStatementCommand).toMatchObject({
				sql: "SELECT link('6f1c', :p2::jsonb, :p3::text[], NULL::jsonb)",
				parameters: [
					{ name: 'p2', value: { stringValue: '[{"a":1}]' } },
					{ name: 'p3', value: { stringValue: '{"a","b"}' } },
				],
			})
		})

		it('makes no call for what the Data API would refuse', async () => {
			await expect(client.query('SELECT 1; SELECT 2')).rejects.toThrow('A query is one statement')
			await expect(client.query('SELECT $1', [])).rejects.toThrow('1 placeholders, up to $1, but 0 parameters')
			await expect(client.query('SELECT $1', ['x'.repeat(70_000)])).rejects.toThrow(
				'over the 65536 the Data API takes'
			)

			expect(calls()).toEqual([])
		})

		it('returns rows as a connection would', async () => {
			api.on(ExecuteStatementCommand).resolves({
				columnMetadata: [
					{ label: 'id', typeName: 'bigserial' },
					{ label: 'count', typeName: 'int8' },
					{ label: 'seen', typeName: 'int4' },
					{ label: 'small', typeName: 'int2' },
					{ label: 'weight', typeName: 'float8' },
					{ label: 'amount', typeName: 'numeric' },
					{ label: 'kept', typeName: 'bool' },
					{ label: 'project_id', typeName: 'uuid' },
					{ label: 'name', typeName: 'text' },
					{ label: 'created_at', typeName: 'timestamptz' },
					{ label: 'local_at', typeName: 'timestamp' },
					{ label: 'meta', typeName: 'jsonb' },
					{ label: 'raw', typeName: 'json' },
					{ label: 'tags', typeName: '_text' },
					{ label: 'ids', typeName: '_int8' },
					{ label: 'flags', typeName: '_bool' },
					{ label: 'scores', typeName: '_float8' },
					{ label: 'bytes', typeName: 'bytea' },
					{ label: 'state', typeName: 'link_state' },
					{ label: 'missing', typeName: 'text' },
					{ label: 'none', typeName: '_text' },
				],
				records: [
					[
						{ stringValue: '9007199254740993' },
						{ stringValue: '3' },
						{ longValue: 2 },
						{ longValue: 1 },
						{ doubleValue: 0.75 },
						{ stringValue: '12.50' },
						{ booleanValue: true },
						{ stringValue: '6f1c1f0e-3b7a-4c58-9d55-0f1f2a3b4c5d' },
						{ stringValue: 'user-1042' },
						{ stringValue: '2026-11-13 10:00:00.25' },
						{ stringValue: '2026-11-13 10:00:00' },
						{ stringValue: '{"page": "/checkout", "n": [1, 2]}' },
						{ stringValue: '{"a":null}' },
						{ arrayValue: { stringValues: ['a', 'b "c"', '{x,y}', ''] } },
						{ arrayValue: { longValues: [1, 2] } },
						{ arrayValue: { booleanValues: [true, false] } },
						{ arrayValue: { doubleValues: [0.5, 2] } },
						{ blobValue: new Uint8Array([104, 105]) },
						{ stringValue: 'open' },
						{ isNull: true },
						{ isNull: true },
					],
				],
			})

			const [row] = await client.query('SELECT * FROM links')

			expect(row).toEqual({
				id: '9007199254740993',
				count: '3',
				seen: 2,
				small: 1,
				weight: 0.75,
				amount: '12.50',
				kept: true,
				project_id: '6f1c1f0e-3b7a-4c58-9d55-0f1f2a3b4c5d',
				name: 'user-1042',
				created_at: new Date('2026-11-13T10:00:00.250Z'),
				local_at: new Date('2026-11-13T10:00:00'),
				meta: { page: '/checkout', n: [1, 2] },
				raw: { a: null },
				tags: ['a', 'b "c"', '{x,y}', ''],
				ids: ['1', '2'],
				flags: [true, false],
				scores: [0.5, 2],
				bytes: Buffer.from('hi'),
				state: 'open',
				missing: null,
				none: null,
			})
			expect(row!.created_at).toBeInstanceOf(Date)
		})

		it('reads a moment the same whether it comes with its offset or without', async () => {
			api.on(ExecuteStatementCommand).resolves({
				columnMetadata: [
					{ label: 'bare', typeName: 'timestamptz' },
					{ label: 'iso', typeName: 'timestamptz' },
					{ label: 'offset', typeName: 'timestamptz' },
				],
				records: [
					[
						{ stringValue: '2026-11-13 10:00:00' },
						{ stringValue: '2026-11-13T10:00:00Z' },
						{ stringValue: '2026-11-13 11:00:00+01' },
					],
				],
			})

			const moment = new Date('2026-11-13T10:00:00Z')

			expect(await client.query('SELECT now()')).toEqual([{ bare: moment, iso: moment, offset: moment }])
		})
	})

	describe('a paused cluster', () => {
		it('is waited for: the query is sent again until the cluster has resumed', async () => {
			api.on(ExecuteStatementCommand)
				.rejectsOnce(resuming())
				.rejectsOnce(resuming())
				.rejectsOnce(resuming())
				.resolves({ columnMetadata: [{ label: 'one', typeName: 'int4' }], records: [[{ longValue: 1 }]] })

			const started = Date.now()

			expect(await settle(client.query('SELECT 1 AS one'))).toEqual([{ one: 1 }])
			expect(calls()).toHaveLength(4)
			expect(Date.now() - started).toBeGreaterThanOrEqual(3000)
		})

		it('fails the query as "cannot connect now" when the cluster takes over a minute', async () => {
			api.on(ExecuteStatementCommand).rejects(resuming())

			const error = await settle(client.query('SELECT 1')).catch(error => error)

			expect(error).toBeInstanceOf(PostgresError)
			expect(getSqlState(error)).toBe('57P03')
			expect(error.message).toBe(
				'Postgres was paused and is still resuming after 60 seconds. Try again in a moment.'
			)
			// Every 3 seconds at most, so a minute is some twenty tries.
			expect(calls().length).toBeGreaterThan(15)
			expect(calls().length).toBeLessThan(30)
		})

		it('waits as long as it is told to', async () => {
			api.on(ExecuteStatementCommand).rejects(resuming())

			const waiting = postgresDataClient({ clusterArn, secretArn, database: 'link', resumeTimeout: 2000 })
			const error = await settle(waiting.query('SELECT 1')).catch(error => error)

			expect(error.message).toContain('still resuming after 2 seconds')
		})

		it('is waited for by a transaction too, before it begins', async () => {
			api.on(BeginTransactionCommand).rejectsOnce(resuming()).resolves({ transactionId: 'tx-1' })
			api.on(ExecuteStatementCommand).resolves({})
			api.on(CommitTransactionCommand).resolves({ transactionStatus: 'Transaction Committed' })

			await settle(transact(client, session => session.query('SELECT 1')))

			expect(calls().map(call => Object.keys(call)[0])).toEqual([
				'BeginTransactionCommand',
				'BeginTransactionCommand',
				'ExecuteStatementCommand',
				'CommitTransactionCommand',
			])
		})
	})

	describe('an error', () => {
		const failWith = async (error: Error) => {
			api.on(ExecuteStatementCommand).rejects(error)

			return client.query('SELECT 1').catch(error => error)
		}

		it('of Postgres is the same error as over a connection, by SQLSTATE', async () => {
			const error = await failWith(
				serviceError(
					'DatabaseErrorException',
					'ERROR: duplicate key value violates unique constraint "links_p0_pkey"\n  Detail: Key (project_id, external_id)=(6f1c, user-7) already exists.; SQLState: 23505'
				)
			)

			expect(error).toBeInstanceOf(PostgresError)
			expect(getSqlState(error)).toBe('23505')
			expect(error.message).toBe('duplicate key value violates unique constraint "links_p0_pkey"')
			expect(error.detail).toBe('Key (project_id, external_id)=(6f1c, user-7) already exists.')
		})

		it('keeps its hint, position & where', async () => {
			const error = await failWith(
				serviceError(
					'DatabaseErrorException',
					'ERROR: deadlock detected\n  Detail: Process 71 waits for ShareLock on transaction 801; blocked by process 72.\n  Hint: See server log for query details.\n  Where: while updating tuple (0,1) in relation "links_p0"; SQLState: 40P01'
				)
			)

			expect(getSqlState(error)).toBe('40P01')
			expect(error.message).toBe('deadlock detected')
			expect(error.detail).toBe('Process 71 waits for ShareLock on transaction 801; blocked by process 72.')
			expect(error.hint).toBe('See server log for query details.')
			expect(error.where).toBe('while updating tuple (0,1) in relation "links_p0"')

			const syntax = await failWith(
				serviceError(
					'DatabaseErrorException',
					'ERROR: syntax error at or near "FORM"\n  Position: 10; SQLState: 42601'
				)
			)

			expect(getSqlState(syntax)).toBe('42601')
			expect(syntax.position).toBe('10')
		})

		it('of a statement out of time is a cancelled statement', async () => {
			const error = await failWith(serviceError('StatementTimeoutException', 'Request timed out'))

			expect(getSqlState(error)).toBe('57014')
			expect(error.message).toBe('canceling statement due to statement timeout')
		})

		it('of a result the Data API has no way to return says what to do', async () => {
			const type = await failWith(
				serviceError(
					'UnsupportedResultException',
					'The result contains the unsupported data type DATEMULTIRANGE.'
				)
			)

			expect(getSqlState(type)).toBe('0A000')
			expect(type.message).toContain('Cast it to text in the query')
			expect(type.message).toContain('DATEMULTIRANGE')

			const size = await failWith(serviceError('DatabaseErrorException', 'Database response exceeded size limit'))

			expect(getSqlState(size)).toBe('54000')
			expect(size.message).toContain('over the 1048576 bytes the Data API returns')
		})

		it('of a connection that broke without an answer is not tried again: the statement may have run', async () => {
			const reset = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' })

			api.on(ExecuteStatementCommand).rejects(reset)

			await expect(client.query('SELECT 1')).rejects.toBe(reset)
			expect(calls()).toHaveLength(1)
		})

		it('of the service itself stays what it is, and is not tried again', async () => {
			const denied = serviceError(
				'AccessDeniedException',
				'User is not authorized to perform: rds-data:ExecuteStatement'
			)

			expect(await failWith(denied)).toBe(denied)
			expect(getSqlState(denied)).toBeUndefined()
			expect(calls()).toHaveLength(1)

			api.reset()

			const unavailable = serviceError('ServiceUnavailableError', 'Service unavailable')

			expect(await failWith(unavailable)).toBe(unavailable)
			expect(calls()).toHaveLength(1)
		})
	})

	describe('a transaction', () => {
		const begun = { resourceArn: clusterArn, secretArn, transactionId: 'tx-1' }

		beforeEach(() => {
			api.on(BeginTransactionCommand).resolves({ transactionId: 'tx-1' })
			api.on(CommitTransactionCommand).resolves({ transactionStatus: 'Transaction Committed' })
			api.on(RollbackTransactionCommand).resolves({ transactionStatus: 'Rollback Complete' })
		})

		it('begins, runs its statements under one id & commits', async () => {
			api.on(ExecuteStatementCommand).resolves({
				columnMetadata: [{ label: 'name', typeName: 'name' }],
				records: [[{ stringValue: 'links' }]],
			})

			const rows = await transact(client, async session => {
				await session.query('CREATE TABLE links (id bigint)')

				return session.query('SELECT tablename AS name FROM pg_tables')
			})

			expect(rows).toEqual([{ name: 'links' }])
			expect(calls()).toEqual([
				{ BeginTransactionCommand: target },
				{
					ExecuteStatementCommand: expect.objectContaining({
						...target,
						sql: 'CREATE TABLE links (id bigint)',
						parameters: undefined,
						transactionId: 'tx-1',
						// A statement that outlives its call runs on.
						continueAfterTimeout: true,
					}),
				},
				{
					ExecuteStatementCommand: expect.objectContaining({
						sql: 'SELECT tablename AS name FROM pg_tables',
						transactionId: 'tx-1',
						continueAfterTimeout: true,
					}),
				},
				{ CommitTransactionCommand: begun },
			])
		})

		it('rolls back when a statement fails, and fails with what Postgres said', async () => {
			api.on(ExecuteStatementCommand)
				.resolvesOnce({})
				.rejects(
					serviceError('DatabaseErrorException', 'ERROR: relation "links" already exists; SQLState: 42P07')
				)

			const error = await transact(client, async session => {
				await session.query('SELECT 1')
				await session.query('CREATE TABLE links (id bigint)')
				await session.query('SELECT 2')
			}).catch(error => error)

			expect(getSqlState(error)).toBe('42P07')
			expect(calls().map(call => Object.keys(call)[0])).toEqual([
				'BeginTransactionCommand',
				'ExecuteStatementCommand',
				'ExecuteStatementCommand',
				'RollbackTransactionCommand',
			])
			expect(calls().at(-1)).toEqual({ RollbackTransactionCommand: begun })
		})

		it('rolls back when its own code throws', async () => {
			const failure = new Error('refused')

			await expect(
				transact(client, async () => {
					throw failure
				})
			).rejects.toBe(failure)

			expect(calls().map(call => Object.keys(call)[0])).toEqual([
				'BeginTransactionCommand',
				'RollbackTransactionCommand',
			])
		})

		it('waits for a statement that outlives its call before the next one', async () => {
			const stillRunning = serviceError('DatabaseErrorException', 'Transaction is still running a query')

			api.on(ExecuteStatementCommand)
				// The index build: its call ends after 45 seconds, the build goes on.
				.rejectsOnce(serviceError('StatementTimeoutException', 'Request timed out'))
				.rejectsOnce(stillRunning)
				.rejectsOnce(stillRunning)
				.resolves({ columnMetadata: [{ label: 'one', typeName: 'int4' }], records: [[{ longValue: 1 }]] })
			api.on(CommitTransactionCommand)
				.rejectsOnce(stillRunning)
				.resolves({ transactionStatus: 'Transaction Committed' })

			const started = Date.now()
			const rows = await settle(
				transact(client, async session => {
					expect(await session.query('CREATE INDEX links_value ON links (value)')).toEqual([])

					return session.query('SELECT 1 AS one')
				})
			)

			expect(rows).toEqual([{ one: 1 }])
			expect(calls().map(call => Object.keys(call)[0])).toEqual([
				'BeginTransactionCommand',
				'ExecuteStatementCommand',
				'ExecuteStatementCommand',
				'ExecuteStatementCommand',
				'ExecuteStatementCommand',
				'CommitTransactionCommand',
				'CommitTransactionCommand',
			])
			// Asked again every 5 seconds.
			expect(Date.now() - started).toBeGreaterThanOrEqual(15_000)
		})

		it('fails when its commit fails', async () => {
			api.on(ExecuteStatementCommand).resolves({})
			api.on(CommitTransactionCommand).rejects(
				serviceError('DatabaseErrorException', 'ERROR: could not serialize access; SQLState: 40001')
			)

			const error = await transact(client, session => session.query('SELECT 1')).catch(error => error)

			expect(getSqlState(error)).toBe('40001')
		})
	})
})
