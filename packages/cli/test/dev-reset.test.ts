import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { Redis } from 'ioredis'
import { afterAll, describe, expect, it } from 'vitest'
import { StackSchema } from '../src/config/stack'
import { createDevContext } from '../src/dev/context'
import { createServerPool } from '../src/dev/pool'
import { createDataReset } from '../src/dev/reset'
import { cacheOnDev } from '../src/feature/cache/dev'
import { tableOnDev } from '../src/feature/table/dev'

describe('dev data reset', () => {
	const pool = createServerPool()

	const stackConfigs = [
		{
			...StackSchema.parse({
				name: 'main',
				caches: { session: {} },
				tables: { items: { hash: 'id' } },
			}),
			file: 'main/stack.jsonc',
		},
	]

	const dev = createDevContext({
		appConfig: { name: 'test-app', region: 'us-east-1' } as never,
		stackConfigs,
		appId: 'test',
		routerPorts: {},
		log: () => {},
		pool,
	})

	afterAll(async () => {
		await pool.stopAll()
	})

	// The reset reads the pooled servers the dev features booted, so
	// this drives the real features rather than hand-built pool entries:
	// a feature changing what it pools must keep the reseed working.
	it('wipes the pooled cache & tables the dev features booted', async () => {
		await cacheOnDev(dev.context)
		await tableOnDev(dev.context)

		for (const server of dev.servers) {
			await server.start({
				dispatch: async () => undefined,
				log: () => {},
				reportFailure: () => {},
				env: dev.env,
			})
		}

		const { server } = await dev.context.useDynamo()
		const documentClient = server.getDocumentClient()
		const TableName = 'test-app--main--table--items'

		await documentClient.send(new PutCommand({ TableName, Item: { id: '1' } }))

		const redis = new Redis({
			host: '127.0.0.1',
			port: Number(dev.env['CACHE_MAIN_SESSION_PORT']),
			lazyConnect: true,
		})
		await redis.connect()
		await redis.set('key', 'value')

		const reset = createDataReset({ pool, stackConfigs })
		await reset()

		expect((await documentClient.send(new ScanCommand({ TableName }))).Items).toEqual([])
		expect(await redis.get('key')).toBeNull()

		redis.disconnect()
	})
})
