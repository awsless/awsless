import { getPostgresDatabaseName, getPostgresSchemaName, Postgres } from '../src/lib/server/postgres'

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

	it('names the database after the app, which a test file has one of its own', () => {
		expect(getPostgresDatabaseName('my-app')).toBe('my_app')

		process.env.APP = 'my-app-t4k2x9'

		expect(getPostgresDatabaseName()).toBe('my_app_t4k2x9')
	})

	it('says so when there is no database to query', async () => {
		process.env.APP = 'no-database'
		delete process.env.POSTGRES_URL
		delete process.env.POSTGRES_CLUSTER_ARN
		delete process.env.POSTGRES_SECRET_ARN
		delete process.env.POSTGRES_DATABASE

		await expect(Postgres.query('SELECT 1')).rejects.toThrow('Postgres has no database to query')
		expect(clients.data).not.toHaveBeenCalled()
		expect(clients.connection).not.toHaveBeenCalled()
	})

	describe('deployed', () => {
		beforeEach(() => {
			process.env.LAMBDA_ENV = 'production'
			process.env.POSTGRES_CLUSTER_ARN = 'arn:aws:rds:eu-west-1:123456789012:cluster:my-app-postgres'
			process.env.POSTGRES_SECRET_ARN =
				'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b'
			delete process.env.POSTGRES_URL
		})

		it('queries through the Data API, in the one database of the app, with one client for the container', async () => {
			process.env.APP = 'deployed-app'
			process.env.POSTGRES_DATABASE = 'deployed_app'
			clients.query.mockResolvedValueOnce([{ one: 1 }])

			expect(await Postgres.query('SELECT $1::int AS one', [1])).toEqual([{ one: 1 }])
			await Postgres.query('SELECT 2')

			expect(clients.data).toHaveBeenCalledExactlyOnceWith({
				clusterArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:my-app-postgres',
				secretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b',
				database: 'deployed_app',
			})
			expect(clients.query).toHaveBeenCalledTimes(2)
			expect(clients.query).toHaveBeenCalledWith('SELECT $1::int AS one', [1])
			expect(clients.connection).not.toHaveBeenCalled()
		})

		it('passes on what a query throws', async () => {
			const failure = Object.assign(new Error('deadlock detected'), { code: '40P01' })

			process.env.APP = 'failing-app'
			process.env.POSTGRES_DATABASE = 'failing_app'
			clients.query.mockRejectedValueOnce(failure)

			await expect(Postgres.query('SELECT 1')).rejects.toBe(failure)
		})
	})

	describe('locally', () => {
		beforeEach(() => {
			process.env.POSTGRES_URL = 'postgres://postgres:postgres@127.0.0.1:55391/postgres'
			process.env.POSTGRES_SCHEMAS = 'billing,shop'
			process.env.POSTGRES_CLUSTER_ARN = 'arn:aws:rds:eu-west-1:123456789012:cluster:my-app-postgres'
			process.env.POSTGRES_SECRET_ARN =
				'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b'
		})

		it('queries over a connection that is as strict as the Data API, even with the cluster in the env', async () => {
			process.env.APP = 'local-app'
			process.env.LAMBDA_ENV = 'production'

			await Postgres.query('SELECT 1')

			// The database of the url, with the schema of every stack to look in.
			expect(clients.connection).toHaveBeenCalledExactlyOnceWith({
				url: 'postgres://postgres:postgres@127.0.0.1:55391/postgres',
				schema: ['billing', 'shop'],
				strict: true,
			})
			expect(clients.data).not.toHaveBeenCalled()
		})

		it('queries the database of the test file in a test', async () => {
			process.env.APP = 'local-app-tfile01'

			await Postgres.query('SELECT 1')

			expect(clients.connection).toHaveBeenCalledExactlyOnceWith({
				url: 'postgres://postgres:postgres@127.0.0.1:55391/local_app_tfile01',
				schema: ['billing', 'shop'],
				strict: true,
			})
		})
	})
})
