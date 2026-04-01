import mqtt, { MqttClient, MqttProtocol } from 'mqtt'

export enum QoS {
	AtMostOnce = 0,
	AtLeastOnce = 1,
	ExactlyOnce = 2,
}

export type ClientPropsProvider = () => ClientProps | Promise<ClientProps>
export type ClientProps = {
	endpoint: string
	clientId?: string
	protocol?: MqttProtocol
	port?: number
	username?: string
	password?: string | Buffer
}

export type Unsubscribe = () => Promise<void>
export type MessageCallback = (payload: Buffer) => void | Promise<void>

const sleep = (delay: number) => new Promise(r => setTimeout(r, delay))

export const createClient = (propsOrProvider: ClientProps | ClientPropsProvider) => {
	const listeners: Record<string, Set<{ callback: MessageCallback }>> = {}
	const queue = new Set<{ topic: string; payload: string | Buffer; qos: QoS }>()

	let connecting = false
	let client: MqttClient | undefined

	const disconnect = async () => {
		if (client) {
			// console.log('disconnect')
			client.removeAllListeners()
			await client.endAsync()
			client = undefined
		}
	}

	// console.log(propsOrProvider)

	const connect = async () => {
		if (connecting || client) return
		if (queue.size === 0 && Object.keys(listeners).length === 0) return

		connecting = true
		const props = typeof propsOrProvider === 'function' ? await propsOrProvider() : propsOrProvider

		// console.log('connect')

		const local = (client = await mqtt.connectAsync(props.endpoint, {
			...props,
			reconnectPeriod: 0,
			resubscribe: false,
		}))

		// console.log('ready!')

		local.on('disconnect', async () => {
			// console.log('reconnecting')
			await disconnect()
			await sleep(1000)
			await connect()
			// local.removeAllListeners()
			// await local.endAsync()
		})

		local.on('message', (topic, payload) => {
			// console.log('message', topic, payload.toString())

			const list = listeners[topic]

			if (list) {
				for (const entry of list) {
					entry.callback(payload)
					// console.log('callback')
				}
			}
		})

		// console.log('subs', Object.keys(listeners))

		// subscribe first
		await local.subscribeAsync(Object.keys(listeners), { qos: QoS.AtLeastOnce })

		// console.log('process message queue', queue)

		await Promise.all([
			...[...queue].map(async msg => {
				await local.publishAsync(msg.topic, msg.payload, { qos: msg.qos })
				queue.delete(msg)
			}),
		])

		connecting = false

		// await new Promise<void>((resolve, reject) => {
		// 	local.on('connect', async () => {
		// 		client = local
		// 		connecting = false

		// 		console.log('sub', Object.keys(listeners))

		// 		await Promise.all([
		// 			local.subscribeAsync(Object.keys(listeners), { qos: QoS.AtLeastOnce }),
		// 			...[...queue].map(async msg => {
		// 				await local.publishAsync(msg.topic, msg.payload, { qos: msg.qos })
		// 				queue.delete(msg)
		// 			}),
		// 		])

		// 		resolve()
		// 	})

		// 	local.on('error', error => {
		// 		cleanup()
		// 		reject(error)
		// 	})
		// })

		// local.on('disconnect', async () => {
		// 	await local.endAsync()
		// 	local.removeAllListeners()
		// })

		// local.on('message', (topic, payload) => {
		// 	const list = listeners[topic]
		// 	if (list) {
		// 		for (const callback of list) {
		// 			callback(payload)
		// 		}
		// 	}
		// })
	}

	return {
		// onChange() {},
		get connected() {
			return client?.connected ?? false
		},
		get topics() {
			return Object.keys(listeners)
		},
		async destroy() {
			await disconnect()
		},
		async publish(topic: string, payload: string | Buffer, qos: QoS = QoS.AtMostOnce) {
			if (client) {
				// console.log('push')
				await client.publishAsync(topic, payload, { qos })
			} else {
				// console.log('lazy')
				queue.add({ topic, payload, qos })
				await connect()
			}
		},
		async subscribe(topic: string, callback: MessageCallback, qos: QoS = QoS.AtMostOnce): Promise<Unsubscribe> {
			const listener = { callback }
			const list = (listeners[topic] = listeners[topic] ?? new Set())

			list.add(listener)

			if (client) {
				if (list.size === 1) {
					// console.log('sub', topic)
					await client.subscribeAsync(topic, { qos })
					// await client.subscribeAsync(topic)
				}
			} else {
				await connect()
			}

			return async () => {
				list.delete(listener)

				if (list.size === 0) {
					// console.log('unsub', topic)

					delete listeners[topic]
					await client?.unsubscribeAsync(topic, { qos })
				}

				if (Object.keys(listeners).length === 0) {
					await disconnect()
				}
			}
		},
	}
}

// const client = createClient({
// 	endpoint: '',
// })

// const unsub = await client.subscribe('topic', payload => {
// 	console.log(payload)
// })

// await client.subscribe('message', payload => {
// 	console.log(payload)
// })

// client.publish('topic', 'Hello')

// unsub()

// type EventMessage = [string, unknown]
// type EventCallback = (payload: unknown) => void

// const createExtendedClient = (propsOrProvider: ClientProps | ClientPropsProvider) => {
// 	const client = createClient(propsOrProvider)
// 	return {
// 		...client,
// 		subscribe(topic: string, event: string, callback: EventCallback) {
// 			return client.subscribe(topic, payload => {
// 				const [evt, message] = JSON.parse(payload.toString('utf8')) as EventMessage

// 				if (evt === event) {
// 					callback(message)
// 				}
// 			})
// 		},
// 	}
// }

// createExtendedClient({
// 	endpoint: '',
// }).subscribe('', '', () => {})
