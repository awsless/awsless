import { watch } from 'fs'
import { basename, dirname } from 'path'
import { PostgresServer } from '@awsless/postgres-server'
import { getPostgresSchemaName } from 'awsless'
import { StackConfig } from '../../config/stack.js'
import { connectServerSink, createServerSink, type ServerSink } from '../../dev/server-sink.js'
import { DevContext } from '../../feature.js'
import { applyStackSchemas } from './util.js'

// The server kept across restarts of the dev environment.
type KeptServer = {
	url: string
	sink: ServerSink
}

export const postgresOnDev = async (ctx: DevContext) => {
	const stacks = ctx.stackConfigs.filter(stack => stack.postgres)

	if (stacks.length === 0) {
		return
	}

	// A real Postgres on a temporary data directory, the same the tests run
	// against. It survives a reload of the environment with its data, and
	// the declared tables & function files reapply on every run.
	const { url, sink } = await ctx.keep<KeptServer>('postgres', null, async () => {
		const sink = createServerSink()
		const server = new PostgresServer({ onExit: sink.onExit, onOutput: sink.onOutput })

		await server.listen()

		return { value: { url: server.url, sink }, stop: () => server.close() }
	})

	const emit = (line: string) => ctx.emitEvent('postgres', { date: Date.now(), line })

	connectServerSink(ctx, 'postgres', sink)

	// The local superuser, reachable from this machine only.
	ctx.addEnv('POSTGRES_URL', url)

	// A new dev session starts on a new, empty server, like every other
	// local resource: the app's seed fills it. A reload keeps the data, and
	// a table whose change a deploy would refuse is recreated instead of failing.
	await applyStackSchemas(url, stacks, { recreate: true })

	for (const stack of stacks) {
		ctx.registerResource({
			kind: 'postgres',
			stack: stack.name,
			id: getPostgresSchemaName(stack.name),
			detail: `127.0.0.1:${new URL(url).port}`,
			channel: 'postgres',
		})
	}

	// A saved function file applies right away, like a saved handler
	// rebuilds. The tables are in the stack file, whose save restarts the
	// whole environment.
	const watchers: ReturnType<typeof watch>[] = []
	const timers = new Map<string, ReturnType<typeof setTimeout>>()

	ctx.registerServer({
		name: 'postgres',
		start({ log }) {
			const apply = async (stack: StackConfig) => {
				try {
					await applyStackSchemas(url, [stack], { recreate: true })
					emit(`Applied the function files of the ${stack.name} stack.`)
				} catch (error) {
					const reason = error instanceof Error ? error.message : String(error)
					const message = `The function files of the ${stack.name} stack failed: ${reason}`

					emit(message)
					log(message)
				}
			}

			for (const stack of stacks) {
				for (const file of stack.postgres?.functions ?? []) {
					watchers.push(
						watch(dirname(file), (_event, filename) => {
							if (filename === basename(file)) {
								// Debounced, so a burst of saves applies once.
								clearTimeout(timers.get(stack.name))
								timers.set(
									stack.name,
									setTimeout(() => void apply(stack), 150)
								)
							}
						})
					)
				}
			}
		},
		stop() {
			for (const watcher of watchers.splice(0)) {
				watcher.close()
			}

			for (const timer of timers.values()) {
				clearTimeout(timer)
			}

			timers.clear()
		},
	})
}
