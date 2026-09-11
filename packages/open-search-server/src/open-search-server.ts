import { RealOpenSearchServer } from './opensearch/real-server'
import { VersionArgs } from './opensearch/version'
import { MemoryOpenSearchServer } from './server'

export type OpenSearchEngineKind = 'memory' | 'opensearch'

export type OpenSearchServerOptions = {
	host?: string
	port?: number
	// 'memory' runs the in-process engine, 'opensearch' the real
	// distribution, downloaded on first use.
	engine?: OpenSearchEngineKind
	// Real engine only.
	version?: VersionArgs
	debug?: boolean
	onExit?: (code: number | null, signal: string | null) => void
	onOutput?: (line: string) => void
}

export class OpenSearchServer {
	readonly engine: OpenSearchEngineKind
	readonly host: string

	private readonly memory: MemoryOpenSearchServer | undefined
	private readonly real: RealOpenSearchServer | undefined

	constructor(options: OpenSearchServerOptions = {}) {
		this.engine = options.engine ?? 'memory'

		if (this.engine === 'opensearch') {
			this.real = new RealOpenSearchServer(options)
		} else {
			this.memory = new MemoryOpenSearchServer(options)
		}

		this.host = (this.memory ?? this.real!).host
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

	// The in-memory engine resets synchronously, the real one over http.
	reset(): Promise<void> {
		if (this.memory) {
			this.memory.reset()
			return Promise.resolve()
		}

		return this.real!.reset()
	}
}
