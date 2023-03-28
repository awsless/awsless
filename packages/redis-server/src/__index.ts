import { RedisMemoryServer } from 'redis-memory-server'
import redis, { RedisClientType } from 'redis'
import path	from 'path'
import fs from 'fs'
import os from 'os'

export class RedisServer {
	private client?: RedisClientType
	private configFile: string
	private process: any

	constructor(private port = 3000) {
		this.configFile	= path.join(
			os.tmpdir(),
			`redis-config-file-${Math.floor(Math.random() * 1000000000)}.conf`
		)
	}

	async flushData() : Promise<Error | void> {
		return new Promise((resolve, reject) => {
			const client = this.client()
			client.flushall((error1 : Error) => {
				client.quit((error2 : Error) => {
					const error = error1 || error2
					if (error) {
						reject(error)
					} else {
						resolve()
					}
				})
			})
		})
	}

	async listen(port: number) {
		if (this.process) {
			throw new Error(`Redis server is already listening on port: ${port}`)
		}

		if(port < 0 || port >= 65536) {
			throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`)
		}

		this.port = port

		const data = `
			save ""
			appendonly no
			port ${ port }
		`

		await fs.promises.writeFile(this.configFile, data)

		this.process = new Server({
			conf: this.configFile
		})

		await this.process.open()
		await this.flushData()
	}

	/** Kill the Redis server. */
	// async kill() {
	// 	await new Promise((resolve, reject) : Promise<Error | void> => {
	// 		this?.client?.quit((error: Error) => {
	// 			if (error) {
	// 				reject(error)
	// 			} else {
	// 				resolve()
	// 			}
	// 		}
	// 	})

	// 	// if (this.process) {
	// 	// 	await this.flushData()

	// 	// 	await this.process.close()
	// 	// 	this.process = undefined

	// 	// 	await fs.promises.unlink(this.configFile)
	// 	// }
	// }

	client() {
		const client = redis.createClient({
			port: 						this.port,
			string_numbers:				true,
			socket_keepalive:			false,
			socket_initial_delay:		0,
			no_ready_check:				false,
			retry_unfulfilled_commands:	false,

			// retry_strategy: (options) ->
				// return

		})

		// client.on('error', error => {
		// 	if (error.code !== 'NR_FATAL') {
		// 		console.error(error)
		// 	}
		// })

		this.client = client

		return client
	}
}
