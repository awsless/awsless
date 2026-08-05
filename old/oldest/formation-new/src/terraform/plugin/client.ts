import { credentials, loadPackageDefinition } from '@grpc/grpc-js'
import { fromJSON } from '@grpc/proto-loader'
import { createDebugger } from '../../formation/debug.ts'
import { throwDiagnosticError } from './diagnostic.ts'
import tfplugin5 from './protocol/tfplugin5.ts'
import tfplugin6 from './protocol/tfplugin6.ts'

export type PluginClient = {
	call: (method: string, payload?: unknown) => Promise<any>
}

const debug = createDebugger('Client')

const protocols: Record<string, object> = {
	tfplugin5,
	tfplugin6,
}

export const createPluginClient = async (props: {
	protocol: string
	endpoint: string
	version: number
}): Promise<PluginClient> => {
	const proto = protocols[props.protocol.split('.').at(0) ?? '']

	// console.log(proto)

	if (!proto) {
		throw new Error(`We don't have support for the ${props.protocol} protocol`)
	}

	const pack = fromJSON(proto)
	const grpc = loadPackageDefinition(pack)

	/** @ts-ignore */
	const client = new grpc['tfplugin' + props.version].Provider(
		`unix://${props.endpoint}`,
		credentials.createInsecure(),
		{
			'grpc.max_receive_message_length': 100 * 1024 * 1024,
			'grpc.max_send_message_length': 100 * 1024 * 1024,
		}
	)

	debug('init', props.protocol)

	await new Promise<void>((resolve, reject) => {
		const deadline = new Date()
		deadline.setSeconds(deadline.getSeconds() + 10)

		client.waitForReady(deadline, (error?: Error) => {
			if (error) {
				reject(error)
			} else {
				resolve()
			}
		})
	})

	debug('connected')

	return {
		call(method, payload) {
			return new Promise((resolve, reject) => {
				const fn = client[method]

				debug('call', method)

				if (!fn) {
					reject(new Error(`Unknown method call: ${method}`))
					return
				}

				fn.call(client, payload, (error: Error | undefined, response: any) => {
					if (error) {
						debug('failed', error)
						reject(error)
					} else if (response.diagnostics) {
						debug('failed', response.diagnostics)
						reject(throwDiagnosticError(response))
					} else {
						resolve(response)
					}
				})
			})
		},
	}
}
