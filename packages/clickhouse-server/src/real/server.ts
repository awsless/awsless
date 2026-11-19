import { ChildProcess, spawn } from 'child_process'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { createServer } from 'net'
import { tmpdir } from 'os'
import { join } from 'path'
import { download } from './download'

export type RealClickHouseServerOptions = {
	host?: string
	port?: number
	debug?: boolean
	// Fires when the server dies after a successful start, without close
	// asking for it.
	onExit?: (code: number | null, signal: string | null) => void
	// Streams the server output after a successful start.
	onOutput?: (line: string) => void
}

// The binary can't pick its own port, so a free one is claimed up front.
const findFreePort = () =>
	new Promise<number>((resolve, reject) => {
		const server = createServer()
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => {
			const port = (server.address() as { port: number }).port
			server.close(() => resolve(port))
		})
	})

// UTC like ClickHouse Cloud. Only the http interface listens: the clients talk http, & leaving out
// the native, mysql & interserver ports means no extra ports to claim.
const configXml = (dir: string, host: string, port: number) => `<clickhouse>
	<logger>
		<level>warning</level>
		<console>1</console>
	</logger>
	<listen_host>${host}</listen_host>
	<timezone>UTC</timezone>
	<http_port>${port}</http_port>
	<path>${dir}/data/</path>
	<tmp_path>${dir}/tmp/</tmp_path>
	<user_files_path>${dir}/user_files/</user_files_path>
	<format_schema_path>${dir}/format_schemas/</format_schema_path>
	<users_config>users.xml</users_config>
	<mark_cache_size>268435456</mark_cache_size>
	<max_server_memory_usage_to_ram_ratio>0.5</max_server_memory_usage_to_ram_ratio>
</clickhouse>
`

// The default user without a password, reachable from this machine only.
const usersXml = `<clickhouse>
	<profiles>
		<default></default>
	</profiles>
	<users>
		<default>
			<password></password>
			<networks>
				<ip>::1</ip>
				<ip>127.0.0.1</ip>
			</networks>
			<profile>default</profile>
			<quota>default</quota>
			<access_management>1</access_management>
		</default>
	</users>
	<quotas>
		<default></default>
	</quotas>
</clickhouse>
`

// A real ClickHouse server for tests & local development, downloaded on
// first use. Its data lives in a temporary directory that close removes.
export class RealClickHouseServer {
	readonly host: string

	private child: ChildProcess | undefined
	private dir: string | undefined
	private stopping = false
	private boundPort = 0

	constructor(private readonly options: RealClickHouseServerOptions = {}) {
		this.host = options.host ?? '127.0.0.1'
	}

	get port() {
		return this.boundPort
	}

	get endpoint() {
		return `http://${this.host}:${this.boundPort}`
	}

	async listen(port = this.options.port ?? 0) {
		if (this.child) {
			throw new Error('The ClickHouse server is already listening')
		}

		const binary = await download()
		const boundPort = port || (await findFreePort())
		const dir = await mkdtemp(join(tmpdir(), 'awsless-clickhouse-'))
		const configFile = join(dir, 'config.xml')

		await writeFile(configFile, configXml(dir, this.host, boundPort))
		await writeFile(join(dir, 'users.xml'), usersXml)

		const child = spawn(binary, ['server', `--config-file=${configFile}`], { cwd: dir })
		const output: string[] = []
		let exited: string | undefined

		const onData = (data: Buffer) => {
			const text = data.toString('utf8')

			if (this.boundPort) {
				for (const line of text.split('\n').filter(Boolean)) {
					this.options.onOutput?.(line)
				}
			} else {
				output.push(text)
			}

			if (this.options.debug) {
				process.stdout.write(text)
			}
		}

		child.stdout?.on('data', onData)
		child.stderr?.on('data', onData)
		child.on('exit', (code, signal) => {
			exited = code !== null ? `exited with code ${code}` : `killed by ${signal}`

			if (this.boundPort && !this.stopping) {
				this.options.onExit?.(code, signal)
			}
		})

		// A dying parent takes the server along instead of leaving it
		// running in the background.
		const killOnExit = () => child.kill('SIGKILL')
		process.once('exit', killOnExit)
		child.once('exit', () => process.off('exit', killOnExit))

		this.child = child
		this.dir = dir

		try {
			await this.waitForReady(boundPort, 60_000, () => exited)
		} catch (error) {
			await this.close()
			throw new Error(`${(error as Error).message}\n${output.join('')}`, { cause: error })
		}

		this.boundPort = boundPort
	}

	async close() {
		const child = this.child
		const dir = this.dir

		this.child = undefined
		this.dir = undefined
		this.boundPort = 0

		if (child && child.exitCode === null && child.signalCode === null) {
			this.stopping = true

			// The data goes with the temporary directory, so a server that
			// takes its time over a graceful shutdown is killed.
			await new Promise(resolve => {
				const timeout = setTimeout(() => child.kill('SIGKILL'), 2000)

				child.once('exit', () => {
					clearTimeout(timeout)
					resolve(undefined)
				})

				child.kill('SIGTERM')
			})

			this.stopping = false
		}

		if (dir) {
			await rm(dir, { recursive: true, force: true })
		}
	}

	// Drops every table, so a run starts from an empty database.
	async reset() {
		if (!this.child) {
			return
		}

		const tables = await this.query(
			`SELECT name FROM system.tables WHERE database = currentDatabase() FORMAT JSONEachRow`
		)

		for (const line of tables.split('\n').filter(Boolean)) {
			const { name } = JSON.parse(line) as { name: string }
			await this.query(`DROP TABLE IF EXISTS \`${name.replaceAll('`', '\\`')}\` SYNC`)
		}
	}

	private async query(sql: string) {
		const response = await fetch(`${this.endpoint}/`, { method: 'POST', body: sql })
		const text = await response.text()

		if (!response.ok) {
			throw new Error(`ClickHouse query failed: ${text}`)
		}

		return text
	}

	private async waitForReady(port: number, timeout: number, exited: () => string | undefined) {
		const deadline = Date.now() + timeout

		while (Date.now() < deadline) {
			const reason = exited()

			if (reason) {
				throw new Error(`ClickHouse ${reason} before starting.`)
			}

			try {
				const response = await fetch(`http://${this.host}:${port}/ping`)

				if (response.ok) {
					return
				}
			} catch {}

			await new Promise(resolve => setTimeout(resolve, 200))
		}

		throw new Error('The local ClickHouse server never became ready.')
	}
}
