import { getPostgresProps, getPostgresSchemaName, Postgres } from '../src/lib/server/postgres'

// The two ways to Postgres, stood in for: which one a stack gets & with
// what is all that is decided here.
const clients = vi.hoisted(() => {
	const query = vi.fn(async (_sql: string, _params?: unknown[]): Promise<unknown[]> => [])
	const client = () => ({ query, close: async () => {} })

	return {
		query,
		connection: vi.fn((_props: Record<string, unknown>) => client()),
		data: vi.fn((_props: Record<string, unknown>) => client()),
	}
})

vi.mock('@awsless/postgres', async importOriginal => ({
	...(await importOriginal<typeof import('@awsless/postgres')>()),
	postgresClient: clients.connection,
	postgresDataClient: clients.data,
}))

describe('postgres', () => {
	const env = { ...process.env }

	beforeEach(() => {
		clients.query.mockClear()
		clients.connection.mockClear()
		clients.data.mockClear()
	})

	afterEach(() => {
		process.env = { ...env }
	})

	it('names the schema of a stack without anything to quote', () => {
		expect(getPostgresSchemaName('link')).toBe('link')
		expect(getPostgresSchemaName('related-links')).toBe('related_links')
		expect(getPostgresSchemaName('relatedLinks')).toBe('related_links')
		expect(getPostgresSchemaName('stack-1')).toBe('stack_1')
	})

	it('keeps the schemas of test files apart by the app prefix', () => {
		process.env.APP = 'my-app-t4k2x9'

		expect(getPostgresProps('related-links').schema).toBe('my_app_t4k2x9__related_links')
		expect((Postgres as any).relatedLinks.schema).toBe('my_app_t4k2x9__related_links')
	})

	it('uses the schema name as is outside tests', () => {
		process.env.APP = 'my-app'
		process.env.LAMBDA_ENV = 'production'

		expect(getPostgresProps('related-links').schema).toBe('related_links')
	})

	it('says so when there is no database to query', async () => {
		process.env.APP = 'my-app'
		delete process.env.POSTGRES_URL
		delete process.env.POSTGRES_CLUSTER_ARN
		delete process.env.POSTGRES_SECRET_ARN

		await expect((Postgres as any).link.query('SELECT 1')).rejects.toThrow('Postgres has no database to query')
		expect(clients.data).not.toHaveBeenCalled()
		expect(clients.connection).not.toHaveBeenCalled()
	})

	describe('deployed', () => {
		beforeEach(() => {
			process.env.APP = 'my-app'
			process.env.LAMBDA_ENV = 'production'
			process.env.POSTGRES_CLUSTER_ARN = 'arn:aws:rds:eu-west-1:123456789012:cluster:my-app-postgres'
			process.env.POSTGRES_SECRET_ARN =
				'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b'
			delete process.env.POSTGRES_URL
		})

		it('queries through the Data API, in the database named like the schema of the stack', async () => {
			clients.query.mockResolvedValueOnce([{ one: 1 }])

			expect(await (Postgres as any).relatedLinks.query('SELECT $1::int AS one', [1])).toEqual([{ one: 1 }])

			expect(clients.data).toHaveBeenCalledExactlyOnceWith({
				clusterArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:my-app-postgres',
				secretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b',
				database: 'related_links',
			})
			expect(clients.query).toHaveBeenCalledExactlyOnceWith('SELECT $1::int AS one', [1])
			expect(clients.connection).not.toHaveBeenCalled()
		})

		it('keeps one client per stack for every query of the container', async () => {
			await (Postgres as any).deployedOnce.query('SELECT 1')
			await (Postgres as any).deployedOnce.query('SELECT 2')
			await (Postgres as any).deployedTwice.query('SELECT 3')

			expect(clients.data.mock.calls.map(([props]) => props.database)).toEqual([
				'deployed_once',
				'deployed_twice',
			])
			expect(clients.query).toHaveBeenCalledTimes(3)
		})

		it('passes on what a query throws', async () => {
			const failure = Object.assign(new Error('deadlock detected'), { code: '40P01' })

			clients.query.mockRejectedValueOnce(failure)

			await expect((Postgres as any).failing.query('SELECT 1')).rejects.toBe(failure)
		})
	})

	describe('locally', () => {
		it('queries over a connection that is as strict as the Data API, even with the cluster in the env', async () => {
			process.env.APP = 'my-app'
			process.env.LAMBDA_ENV = 'production'
			process.env.POSTGRES_URL = 'postgres://postgres:postgres@127.0.0.1:55391/postgres'
			process.env.POSTGRES_CLUSTER_ARN = 'arn:aws:rds:eu-west-1:123456789012:cluster:my-app-postgres'
			process.env.POSTGRES_SECRET_ARN =
				'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b'

			await (Postgres as any).localStack.query('SELECT 1')

			expect(clients.connection).toHaveBeenCalledExactlyOnceWith({
				url: 'postgres://postgres:postgres@127.0.0.1:55391/postgres',
				schema: 'local_stack',
				max: 4,
				strict: true,
			})
			expect(clients.data).not.toHaveBeenCalled()
		})
	})
})
