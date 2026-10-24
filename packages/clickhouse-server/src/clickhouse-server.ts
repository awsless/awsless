import { MemoryClickHouseServer } from './memory/server'
import { RealClickHouseServer } from './real/server'

export type ClickHouseEngineKind = 'memory' | 'clickhouse'

export type ClickHouseServerOptions = {
	host?: string
	port?: number
	// 'memory' runs the in-process engine, 'clickhouse' the real binary,
	// downloaded on first use.
	engine?: ClickHouseEngineKind
	// Real engine only.
	debug?: boolean
	onExit?: (code: number | null, signal: string | null) => void
	onOutput?: (line: string) => void
}

export class ClickHouseServer {
	readonly engine: ClickHouseEngineKind

	private readonly memory: MemoryClickHouseServer | undefined
	private readonly real: RealClickHouseServer | undefined

	constructor(options: ClickHouseServerOptions = {}) {
		this.engine = options.engine ?? 'memory'

		if (this.engine === 'clickhouse') {
			this.real = new RealClickHouseServer(options)
		} else {
			this.memory = new MemoryClickHouseServer(options)
		}
	}

	get host() {
		return (this.memory ?? this.real!).host
	}

	get port() {
		return (this.memory ?? this.real!).port
	}

	get endpoint() {
		return (this.memory ?? this.real!).endpoint
	}

	async listen(port?: number) {
		await (this.memory ?? this.real!).listen(port)
	}

	async close() {
		await (this.memory ?? this.real!).close()
	}

	// Drops every table.
	async reset() {
		await (this.memory ?? this.real!).reset()
	}
}
