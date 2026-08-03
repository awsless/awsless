import { RedisServer } from '@awsless/redis'
import { constantCase } from 'change-case'
import { DevContext } from '../../feature.js'

// Every cache runs as its own local redis instance, mirroring the one
// elasticache per cache resource in production.
export const cacheOnDev = async (ctx: DevContext) => {
	const caches = ctx.stackConfigs.flatMap(stack => {
		return Object.keys(stack.caches ?? {}).map(id => ({ stackName: stack.name, id }))
	})

	if (caches.length === 0) {
		return
	}

	const servers: RedisServer[] = []

	for (const { stackName, id } of caches) {
		const server = new RedisServer()

		await server.start()
		await server.ping()

		servers.push(server)

		const port = await server.getPort()
		const prefix = `CACHE_${constantCase(stackName)}_${constantCase(id)}`

		ctx.addEnv(`${prefix}_HOST`, 'localhost')
		ctx.addEnv(`${prefix}_PORT`, String(port))
		ctx.addEnv(`${prefix}_SLAVE_HOST`, 'localhost')
		ctx.addEnv(`${prefix}_SLAVE_PORT`, String(port))

		ctx.registerResource({
			kind: 'cache',
			stack: stackName,
			id,
			detail: `localhost:${port}`,
		})
	}

	ctx.registerServer({
		name: 'redis',
		start() {},
		async stop() {
			await Promise.all(servers.map(server => server.kill()))
		},
	})
}
