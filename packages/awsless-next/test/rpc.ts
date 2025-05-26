import { mockDynamoDB, seedTable } from '@awsless/dynamodb'
import { mockLambda } from '@awsless/lambda'
import handle from '../src/feature/rpc/server/handle'
import { lockTable, schemaTable } from '../src/feature/rpc/server/table'
import { RpcAuthorizerResponse } from '../src/server'

describe('RPC server', () => {
	describe('lock', () => {
		mockLambda({
			auth: (): RpcAuthorizerResponse => {
				return {
					authorized: true,
					lockKey: 'user',
					ttl: '1 hour',
				}
			},
			echo: event => {
				return event
			},
		})

		process.env.AUTH = 'auth'

		mockDynamoDB({
			tables: [schemaTable, lockTable],
			seed: [
				seedTable(schemaTable, [
					{
						query: 'echo',
						function: 'echo',
					},
				]),
			],
		})

		it('', async () => {
			const results = await Promise.all(
				Array.from({ length: 10 }).map(async () => {
					const response = await handle({
						requestContext: {
							http: {
								userAgent: '',
								sourceIp: '',
							},
						},
						headers: {
							authentication: 'token',
						},
						body: JSON.stringify([
							{
								name: 'echo',
								payload: {
									foo: 'bar',
								},
							},
						]),
					} as any)

					return (response as any).statusCode
				})
			)

			const errors = results.filter(n => n === 429)
			const successes = results.filter(n => n === 200)

			expect(errors.length).toBe(9)
			expect(successes.length).toBe(1)
		})
	})
})
