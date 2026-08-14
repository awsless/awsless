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

	for (const { stackName, id } of caches) {
		// Every cache redis survives dev restarts, keeping its data. The
		// health sink swaps every run, since each run builds a fresh
		// registry - a crash while no run listened still reports through
		// the crashed marker.
		const { port, sink } = await ctx.keep(`cache:${stackName}:${id}`, null, async () => {
			const server = new RedisServer()

			await server.start()
			await server.ping()

			const sink: {
				health?: (status: 'up' | 'down', detail?: string) => void
				log?: (line: string) => void
				tail: string[]
				crashed?: string
			} = { tail: [] }

			server.onExit((code, signal) => {
				sink.crashed = code !== null ? `exited with code ${code}` : `killed by ${signal}`
				sink.health?.('down', sink.crashed)
			})

			// The output streams to the dashboard's cache panel, with a
			// short tail replayed into every fresh run's event bus.
			server.onOutput(line => {
				sink.tail.push(line)

				while (sink.tail.length > 20) {
					sink.tail.shift()
				}

				sink.log?.(line)
			})

			return { value: { port: await server.getPort(), sink }, stop: () => server.kill() }
		})

		const channel = `cache:${stackName}:${id}`

		sink.health = (status, detail) => ctx.reportHealth(`cache ${stackName}/${id}`, status, detail)
		sink.health(sink.crashed ? 'down' : 'up', sink.crashed)
		sink.log = line => ctx.emitEvent(channel, { date: Date.now(), line })

		for (const line of sink.tail) {
			ctx.emitEvent(channel, { date: Date.now(), line })
		}

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
			channel,
		})
	}

}
