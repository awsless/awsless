import { ChildProcess, execFile, spawn } from 'child_process'
import { rmSync } from 'fs'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises'
import { createServer } from 'net'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { getBinaries } from './binary'

const exec = promisify(execFile)

export type PostgresServerOptions = {
	port?: number
	// Fires when the server dies after a successful start, without close
	// asking for it.
	onExit?: (code: number | null, signal: string | null) => void
	// Streams the server log after a successful start.
	onOutput?: (line: string) => void
}

// The superuser of every local server. It only listens on this machine.
const USER = 'postgres'
const PASSWORD = 'postgres'
const DATABASE = 'postgres'

// Far more than a test run's workers open together, each with a pool per schema.
const MAX_CONNECTIONS = 500

const READY = 'database system is ready to accept connections'

// Every temporary data directory is named after the process that owns it.
const TEMPORARY = /^awsless-postgres-(\d+)-/

const isAlive = (pid: number) => {
	try {
		process.kill(pid, 0)
	} catch (error) {
		// Without the right to signal it, it still exists.
		return (error as { code?: string }).code === 'EPERM'
	}

	return true
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// The server that runs on a data directory right now. Its pid file names
// the process, and only a process that really runs Postgres on this
// directory counts: the pid may be another program's by now.
const findServerIn = async (dir: string) => {
	const [line = ''] = (await readFile(join(dir, 'postmaster.pid'), 'utf8').catch(() => '')).split('\n')
	const pid = Number(line)

	if (!pid || !isAlive(pid)) {
		return
	}

	const { stdout } = await exec('ps', ['-ww', '-o', 'command=', '-p', String(pid)]).catch(() => ({
		stdout: '',
	}))

	return stdout.includes(dir) ? pid : undefined
}

const stopServer = async (pid: number) => {
	process.kill(pid, 'SIGQUIT')

	// A server that takes too long over its shutdown is killed.
	for (const deadline = Date.now() + 15_000; isAlive(pid);) {
		if (Date.now() > deadline) {
			process.kill(pid, 'SIGKILL')
			break
		}

		await sleep(50)
	}
}

// A parent that is killed hard can't stop its temporary server, so the next
// server to start stops & removes the ones whose owner is gone.
const reapOrphans = async () => {
	for (const name of await readdir(tmpdir()).catch(() => [])) {
		const owner = TEMPORARY.exec(name)

		if (owner && !isAlive(Number(owner[1]))) {
			const dir = join(tmpdir(), name)
			const pid = await findServerIn(dir).catch(() => undefined)

			if (pid) {
				await stopServer(pid).catch(() => {})
			}

			await rm(dir, { recursive: true, force: true }).catch(() => {})
		}
	}
}

// Postgres can't pick its own port, so a free one is claimed up front.
const findFreePort = () =>
	new Promise<number>((resolve, reject) => {
		const server = createServer()
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => {
			const port = (server.address() as { port: number }).port
			server.close(() => resolve(port))
		})
	})

const createCluster = async (initdb: string, dir: string) => {
	const passwordFile = join(await mkdtemp(join(tmpdir(), 'awsless-pgpass-')), 'password')

	await writeFile(passwordFile, `${PASSWORD}\n`, { mode: 0o600 })

	try {
		await exec(
			initdb,
			[
				`--pgdata=${dir}`,
				`--username=${USER}`,
				`--pwfile=${passwordFile}`,
				// Passwords are checked like a deployed database checks them.
				'--auth=scram-sha-256',
				'--encoding=UTF8',
				// The same text order & case rules on every machine, close to
				// the en_US.UTF-8 of a deployed database: this machine's own
				// locale would differ per operating system.
				'--locale=C',
				'--locale-provider=icu',
				'--icu-locale=en-US',
				'--no-instructions',
				'--no-sync',
			],
			{ env: { ...process.env, LC_MESSAGES: 'C' } }
		)
	} catch (error) {
		const output = (error as { stderr?: string }).stderr ?? ''

		throw new Error(`Creating the local Postgres database failed.\n${output}`, { cause: error })
	} finally {
		await rm(join(passwordFile, '..'), { recursive: true, force: true })
	}
}

// A real Postgres 17 server for tests & local development, from the
// binaries the embedded-postgres package installs, on a temporary data
// directory that close removes.
export class PostgresServer {
	readonly host = '127.0.0.1'

	private child: ChildProcess | undefined
	private dir: string | undefined
	private stopping = false
	private boundPort = 0

	constructor(private readonly options: PostgresServerOptions = {}) {}

	get port() {
		return this.boundPort
	}

	// A superuser on the database every server starts with.
	get url() {
		return `postgres://${USER}:${PASSWORD}@${this.host}:${this.boundPort}/${DATABASE}`
	}

	async listen(port = this.options.port ?? 0) {
		if (this.child) {
			throw new Error('The Postgres server is already listening')
		}

		const binaries = await getBinaries()

		await reapOrphans()

		const dir = await mkdtemp(join(tmpdir(), `awsless-postgres-${process.pid}-`))

		this.dir = dir

		try {
			await createCluster(binaries.initdb, dir)
		} catch (error) {
			await this.close()
			throw error
		}

		const boundPort = port || (await findFreePort())

		const child = spawn(
			binaries.postgres,
			[
				'-D',
				dir,
				'-p',
				String(boundPort),
				// Tcp on this machine only, without a socket file in /tmp.
				'-c',
				`listen_addresses=${this.host}`,
				'-c',
				'unix_socket_directories=',
				'-c',
				`max_connections=${MAX_CONNECTIONS}`,
				// UTC like a deployed database, whatever this machine's zone is.
				'-c',
				'timezone=UTC',
				'-c',
				'log_timezone=UTC',
				// Data that goes with the server skips the disk syncs.
				'-c',
				'synchronous_commit=off',
				'-c',
				'fsync=off',
				'-c',
				'full_page_writes=off',
			],
			{ env: { ...process.env, LC_MESSAGES: 'C' }, stdio: ['ignore', 'pipe', 'pipe'] }
		)

		let startup = ''

		const ready = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('The local Postgres server never became ready.')), 60_000)

			const onData = (data: Buffer) => {
				const text = data.toString('utf8')

				if (this.boundPort) {
					for (const line of text.split('\n').filter(Boolean)) {
						this.options.onOutput?.(line)
					}

					return
				}

				startup += text

				if (startup.includes(READY)) {
					clearTimeout(timeout)
					resolve()
				}
			}

			child.stdout?.on('data', onData)
			child.stderr?.on('data', onData)
			child.once('error', error => {
				clearTimeout(timeout)
				reject(error)
			})
			child.once('exit', (code, signal) => {
				const reason = code !== null ? `exited with code ${code}` : `was killed by ${signal}`

				clearTimeout(timeout)
				reject(new Error(`Postgres ${reason} before starting.`))

				if (this.boundPort && !this.stopping) {
					this.options.onExit?.(code, signal)
				}
			})
		})

		// A dying parent takes the server & its data along instead of leaving
		// it running in the background.
		const stopOnExit = () => {
			child.kill('SIGQUIT')
			rmSync(dir, { recursive: true, force: true })
		}

		process.once('exit', stopOnExit)
		child.once('exit', () => process.off('exit', stopOnExit))

		this.child = child

		try {
			await ready
		} catch (error) {
			await this.close()
			throw new Error(`${(error as Error).message}\n${startup}`, { cause: error })
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

			await new Promise(resolve => {
				// A server that takes too long over its shutdown is killed.
				const timeout = setTimeout(() => child.kill('SIGKILL'), 5000)

				child.once('exit', () => {
					clearTimeout(timeout)
					resolve(undefined)
				})

				child.kill('SIGQUIT')
			})

			this.stopping = false
		}

		if (dir) {
			await rm(dir, { recursive: true, force: true })
		}
	}
}
