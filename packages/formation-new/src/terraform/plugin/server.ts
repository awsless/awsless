import { spawn } from 'node:child_process'
import { createDebugger } from '../../formation/debug.ts'

export type PluginServer = {
	protocol: string
	version: number
	endpoint: string

	kill: () => void
}

const debug = createDebugger('Server')

export const createPluginServer = (props: { file: string; debug?: boolean }) => {
	return new Promise<PluginServer>((resolve, reject) => {
		const process = spawn(`${props.file}`, ['-debug'])

		debug('init')

		process.stderr.on('data', (data: Buffer) => {
			// For some reason we need to listen to stderr data logs...
			if (props.debug) {
				const message = data.toString('utf8')
				console.log(message)
			}
		})

		process.stdout.once('data', (data: Buffer) => {
			try {
				const message = data.toString('utf8')
				const matches = message.match(/TF_REATTACH_PROVIDERS\=\'(.*)\'/)

				if (matches && matches.length > 0) {
					const match = matches[0]
					const json = match.slice(23, -1)
					const data = JSON.parse(json)
					const entries = Object.values(data)

					if (entries.length > 0) {
						const entry: any = entries[0]!
						const version: number = entry.ProtocolVersion
						const endpoint: string = entry.Addr.String

						debug('started', endpoint)

						resolve({
							kill() {
								process.kill()
							},
							protocol: 'tfplugin' + version.toFixed(1),
							version,
							endpoint,
						})

						return
					}
				}
			} catch (error) {}

			reject(new Error('Failed to start the plugin'))
		})
	})
}
