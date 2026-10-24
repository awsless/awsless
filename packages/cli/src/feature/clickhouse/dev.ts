import { clickhouseClient } from '@awsless/clickhouse'
import { ClickHouseServer } from '@awsless/clickhouse-server'
import { formatClickHouseTableName } from 'awsless'
import { localEngine } from '../../dev/engine.js'
import { DevContext } from '../../feature.js'
import { applyTable } from './table.js'

export const clickhouseOnDev = async (ctx: DevContext) => {
	const tables = ctx.stackConfigs.flatMap(stack => {
		return Object.entries(stack.clickhouse ?? {}).map(([id, props]) => ({ stackName: stack.name, id, props }))
	})

	if (tables.length === 0) {
		return
	}

	// The same server the tests run against: in-memory by default, the
	// real binary with AWSLESS_LOCAL_ENGINE=real. It survives dev restarts
	// so the data stays put, & the declared tables reapply on every run.
	const { port, sink } = await ctx.keep('clickhouse', null, async () => {
		const sink: {
			health?: (status: 'up' | 'down', detail?: string) => void
			log?: (line: string) => void
			tail: string[]
			crashed?: string
		} = { tail: [] }

		const server = new ClickHouseServer({
			engine: localEngine() === 'real' ? 'clickhouse' : 'memory',
			onExit(code, signal) {
				sink.crashed = code !== null ? `exited with code ${code}` : `killed by ${signal}`
				sink.health?.('down', sink.crashed)
			},
			onOutput(line) {
				sink.tail.push(line)

				while (sink.tail.length > 20) {
					sink.tail.shift()
				}

				sink.log?.(line)
			},
		})

		await server.listen()

		return { value: { port: server.port, sink }, stop: () => server.close() }
	})

	sink.health = (status, detail) => ctx.reportHealth('clickhouse', status, detail)
	sink.health(sink.crashed ? 'down' : 'up', sink.crashed)
	sink.log = line => ctx.emitEvent('clickhouse', { date: Date.now(), line })

	for (const line of sink.tail) {
		ctx.emitEvent('clickhouse', { date: Date.now(), line })
	}

	const endpoint = `http://127.0.0.1:${port}`

	// No password locally: the default user only listens on this machine.
	ctx.addEnv('CLICKHOUSE_ENDPOINT', endpoint)

	const client = clickhouseClient({ endpoint })

	for (const { stackName, id, props } of tables) {
		// Local data can go, so a new engine or key recreates the table
		// instead of failing like a deploy does.
		await applyTable(client, formatClickHouseTableName(stackName, id), props, { recreate: true })

		ctx.registerResource({
			kind: 'clickhouse',
			stack: stackName,
			id,
			detail: `127.0.0.1:${port}`,
			channel: 'clickhouse',
		})
	}
}
