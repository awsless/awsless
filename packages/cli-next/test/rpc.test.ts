import { hours } from '@awsless/duration'
import { formatRouteEnvName, RouteInvoker, withRoute } from 'awsless'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import handle from '../src/feature/rpc/server/handle'

const locks = vi.hoisted(() => new Set<string>())

vi.mock('@awsless/dynamodb', async importOriginal => {
	const dynamodb = await importOriginal<typeof import('@awsless/dynamodb')>()

	return {
		...dynamodb,
		updateItem: async (_table: unknown, key: { key: string }) => {
			if (locks.has(key.key)) {
				throw new dynamodb.ConditionalCheckFailedException({ $metadata: {} })
			}

			locks.add(key.key)
		},
		deleteItem: async (_table: unknown, key: { key: string }) => {
			locks.delete(key.key)
		},
	}
})

const serverRoute = 'test:rpc:server'
const otherServerRoute = 'test:rpc:other-server'

process.env.AWSLESS_ROUTE = serverRoute
process.env[formatRouteEnvName(serverRoute, 'LOCK_TABLE')] = 'lock'
process.env[formatRouteEnvName(serverRoute, 'TIMEOUT')] = '60'

// The baked query whitelist for both RPC APIs.
process.env[formatRouteEnvName(serverRoute, 'QUERY:echo')] = JSON.stringify({ function: 'test:rpc:echo' })
process.env[formatRouteEnvName(serverRoute, 'QUERY:read')] = JSON.stringify({ function: 'test:rpc:echo' })
process.env[formatRouteEnvName(serverRoute, 'QUERY:write')] = JSON.stringify({ function: 'test:rpc:echo' })
process.env[formatRouteEnvName(serverRoute, 'QUERY:locked')] = JSON.stringify({
	function: 'test:rpc:echo',
	lock: true,
})
process.env[formatRouteEnvName(otherServerRoute, 'QUERY:read')] = JSON.stringify({ function: 'test:rpc:other-echo' })

// The rpc server dispatches queries & auth in-process through
// the bundle run hook, which returns revived responses.
const invokeRoute: RouteInvoker = async (route, payload) => {
	switch (route) {
		case 'test:rpc:lock-auth':
			return {
				authorized: true,
				lockKey: 'user',
				ttl: hours(1),
			}
		case 'test:rpc:permission-auth':
			return {
				authorized: true,
				allowedFunctions: ['read'],
				ttl: hours(1),
			}
		case 'test:rpc:other-auth':
			return { authorized: false }
		case 'test:rpc:echo':
			// add a delay in order to test the locking feature.
			await new Promise(r => setTimeout(r, 100))

			return payload
		case 'test:rpc:other-echo':
			return { route: 'other' }
	}

	throw new Error('Unknown bundle route: ' + route)
}

describe('RPC server', () => {
	beforeEach(() => {
		locks.clear()
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
	const invoke = (payload: unknown, token?: string) => {
		return withRoute(process.env.AWSLESS_ROUTE!, invokeRoute, () => handle(createRequest(payload, token)))
	}

	describe('lock', () => {
		it('only one request should succeed', async () => {
			process.env[formatRouteEnvName(serverRoute, 'AUTH')] = 'test:rpc:lock-auth'

			const results = await Promise.all(
				Array.from({ length: 10 }).map(async () => {
					const response = await invoke([{ name: 'locked' }])

					return response.statusCode
				})
			)

			const errors = results.filter(n => n === 429)
			const successes = results.filter(n => n === 200)

			expect(errors.length).toBe(9)
			expect(successes.length).toBe(1)
		})
	})

	describe('permissions', () => {
		it('should fail for invalid permissions', async () => {
			process.env[formatRouteEnvName(serverRoute, 'AUTH')] = 'test:rpc:permission-auth'

			const result = await invoke([{ name: 'write' }], 'token-2')

			expect(result.statusCode).toBe(200)
			expect(JSON.parse(result.body)[0].ok).toBe(false)
		})

		it('should succeed for valid permissions', async () => {
			process.env[formatRouteEnvName(serverRoute, 'AUTH')] = 'test:rpc:permission-auth'

			const result = await invoke([{ name: 'read' }], 'token-2')

			expect(result.statusCode).toBe(200)
			expect(JSON.parse(result.body)[0].ok).toBe(true)
		})
	})

	describe('route isolation', () => {
		it('should isolate auth caches between RPC APIs', async () => {
			process.env[formatRouteEnvName(serverRoute, 'AUTH')] = 'test:rpc:permission-auth'
			await invoke([{ name: 'read' }], 'shared-token')

			process.env.AWSLESS_ROUTE = otherServerRoute
			process.env[formatRouteEnvName(otherServerRoute, 'AUTH')] = 'test:rpc:other-auth'

			try {
				const result = await invoke([{ name: '$allowedFunctions' }], 'shared-token')

				expect(result.statusCode).toBe(405)
			} finally {
				process.env.AWSLESS_ROUTE = serverRoute
			}
		})

		it('should isolate the query whitelist between RPC APIs', async () => {
			process.env.AWSLESS_ROUTE = otherServerRoute
			delete process.env[formatRouteEnvName(otherServerRoute, 'AUTH')]

			try {
				const result = await invoke([{ name: 'read' }])

				expect(JSON.parse(result.body)[0]).toStrictEqual({
					ok: true,
					data: { route: 'other' },
				})
			} finally {
				process.env.AWSLESS_ROUTE = serverRoute
			}
		})
	})
})
