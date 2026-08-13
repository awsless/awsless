import { hours } from '@awsless/duration'
import { mockDynamoDB, seedTable } from '@awsless/dynamodb'
import { unpatch } from '@awsless/json'
import { mockLambda } from '@awsless/lambda'
import handle from '../src/feature/rpc/server/handle'
import { lockTable, schemaTable } from '../src/feature/rpc/server/table'

describe('RPC server', () => {
	mockLambda({
		'lock-auth': () => {
			return unpatch({
				authorized: true,
				lockKey: 'user',
				ttl: hours(1),
			})
		},
		'permission-auth': () => {
			return unpatch({
				authorized: true,
				allowedFunctions: ['read'],
				ttl: hours(1),
			})
		},
		echo: async event => {
			// add a delay in order to test the locking feature.
			await new Promise(r => setTimeout(r, 100))

			return event
		},
	})

	mockDynamoDB({
		tables: [schemaTable, lockTable],
		seed: [
			seedTable(schemaTable, [
				{
					query: 'echo',
					function: 'echo',
				},
				{
					query: 'read',
					function: 'echo',
				},
				{
					query: 'write',
					function: 'echo',
				},
				{
					query: 'locked',
					function: 'echo',
					lock: true,
				},
			]),
		],
	})

	const createRequest = (payload: any, token = 'token') => {
		return {
			requestContext: {
				http: {
					method: 'POST',
					userAgent: '',
					sourceIp: '',
				},
			},
			headers: {
				authentication: token,
			},
			body: JSON.stringify(payload),
		} as any
	}

	describe('lock', () => {
		it('only one request should succeed', async () => {
			process.env.AUTH = 'lock-auth'

			const results = await Promise.all(
				Array.from({ length: 10 }).map(async () => {
					const response = await handle(createRequest([{ name: 'locked' }]))

					// console.log(response);

					return response.statusCode
				})
			)

			const errors = results.filter(n => n === 429)
			const successes = results.filter(n => n === 200)

			// console.log(results)

			expect(errors.length).toBe(9)
			expect(successes.length).toBe(1)
		})
	})

	describe('permissions', () => {
		it('should fail for invalid permissions', async () => {
			process.env.AUTH = 'permission-auth'

			const result = await handle(createRequest([{ name: 'write' }], 'token-2'))

			console.log(result)

			expect(result.statusCode).toBe(200)
			expect(JSON.parse(result.body)[0].ok).toBe(false)
		})

		it('should secceed for valid permissions', async () => {
			process.env.AUTH = 'permission-auth'

			const result = await handle(createRequest([{ name: 'read' }], 'token-2'))

			console.log(result)

			expect(result.statusCode).toBe(200)
			expect(JSON.parse(result.body)[0].ok).toBe(true)
		})
	})
})
