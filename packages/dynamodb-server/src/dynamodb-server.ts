import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { VirtualClock } from './clock.js'
import { createJavaServer, type JavaServerInstance } from './java-server.js'
import { createServer, type ServerInstance } from './server.js'
import { TableStore } from './store/index.js'
import type { StreamCallback } from './types.js'

export type Engine = 'memory' | 'java'

export interface DynamoDBServerConfig {
	port?: number
	region?: string
	hostname?: string
	/**
	 * The engine to use for the DynamoDB server.
	 * - 'memory': Fast in-memory implementation (default)
	 * - 'java': Java-based DynamoDB Local (requires dynamo-db-local package)
	 */
	engine?: Engine
}

interface InternalConfig {
	port: number
	region: string
	hostname: string
	engine: Engine
}

interface MutableEndpoint {
	protocol: string
	hostname: string
	port?: number
	path: string
}

export class DynamoDBServer {
	private server?: ServerInstance
	private javaServer?: JavaServerInstance
	private store: TableStore
	private clock: VirtualClock
	private config: InternalConfig
	private endpoint: MutableEndpoint
	private client?: DynamoDBClient
	private documentClient?: DynamoDBDocumentClient
	private streamCallbacks: Map<string, Set<StreamCallback>> = new Map()

	constructor(config: DynamoDBServerConfig = {}) {
		this.config = {
			port: config.port ?? 0,
			region: config.region ?? 'us-east-1',
			hostname: config.hostname ?? 'localhost',
			engine: config.engine ?? 'memory',
		}
		this.endpoint = {
			protocol: 'http:',
			hostname: this.config.hostname,
			path: '/',
		}
		this.store = new TableStore(this.config.region)
		this.clock = new VirtualClock()
	}

	async listen(port?: number): Promise<void> {
		if (this.server || this.javaServer) {
			throw new Error('Server is already running')
		}

		const listenPort = port ?? this.config.port

		if (this.config.engine === 'java') {
			this.javaServer = createJavaServer(listenPort, this.config.region)
			await this.javaServer.wait()
			this.config.port = this.javaServer.port
		} else {
			const serverOrPromise = createServer(this.store, listenPort)

			if (serverOrPromise instanceof Promise) {
				this.server = await serverOrPromise
			} else {
				this.server = serverOrPromise
			}

			this.config.port = this.server.port
		}

		this.endpoint.port = this.config.port
	}

	async stop(): Promise<void> {
		if (this.server) {
			this.server.stop()
			this.server = undefined
		}

		if (this.javaServer) {
			await this.javaServer.stop()
			this.javaServer = undefined
		}

		this.client = undefined
		this.documentClient = undefined
	}

	get port(): number {
		return this.config.port
	}

	get engine(): Engine {
		return this.config.engine
	}

	getEndpoint(): MutableEndpoint {
		return this.endpoint
	}

	getClient(): DynamoDBClient {
		if (!this.client) {
			this.client = new DynamoDBClient({
				endpoint: this.endpoint,
				region: this.config.region,
				credentials: {
					accessKeyId: 'fake',
					secretAccessKey: 'fake',
				},
			})
		}
		return this.client
	}

	getDocumentClient(): DynamoDBDocumentClient {
		if (!this.documentClient) {
			this.documentClient = DynamoDBDocumentClient.from(this.getClient(), {
				marshallOptions: {
					removeUndefinedValues: true,
				},
			})
		}
		return this.documentClient
	}

	/**
	 * Advance the virtual clock by the specified number of milliseconds.
	 * This triggers TTL processing for expired items.
	 * Only available when using the 'memory' engine.
	 */
	advanceTime(ms: number): void {
		if (this.config.engine === 'java') {
			throw new Error('advanceTime is not supported with the Java engine')
		}
		this.clock.advance(ms)
		this.processTTL()
	}

	/**
	 * Set the virtual clock to the specified timestamp.
	 * This triggers TTL processing for expired items.
	 * Only available when using the 'memory' engine.
	 */
	setTime(timestamp: number): void {
		if (this.config.engine === 'java') {
			throw new Error('setTime is not supported with the Java engine')
		}
		this.clock.set(timestamp)
		this.processTTL()
	}

	/**
	 * Get the current virtual clock time.
	 * Only available when using the 'memory' engine.
	 */
	getTime(): number {
		if (this.config.engine === 'java') {
			throw new Error('getTime is not supported with the Java engine')
		}
		return this.clock.now()
	}

	private processTTL(): void {
		const currentTimeSeconds = this.clock.nowInSeconds()
		this.store.expireTtlItems(currentTimeSeconds)
	}

	/**
	 * Register a callback for stream records on a specific table.
	 * Only available when using the 'memory' engine.
	 */
	onStreamRecord(tableName: string, callback: StreamCallback): () => void {
		if (this.config.engine === 'java') {
			throw new Error('onStreamRecord is not supported with the Java engine')
		}
		const table = this.store.getTable(tableName)
		return table.onStreamRecord(callback)
	}

	/**
	 * Reset the server, clearing all tables and data.
	 * Only available when using the 'memory' engine.
	 */
	reset(): void {
		if (this.config.engine === 'java') {
			throw new Error('reset is not supported with the Java engine')
		}
		this.store.clear()
		this.clock.reset()
		this.streamCallbacks.clear()
	}

	/**
	 * Get the internal table store.
	 * Only available when using the 'memory' engine.
	 */
	getTableStore(): TableStore {
		if (this.config.engine === 'java') {
			throw new Error('getTableStore is not supported with the Java engine')
		}
		return this.store
	}
}
