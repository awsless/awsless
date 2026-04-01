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

export type DebugCallback = (...args: unknown[]) => void

export const createClient = (propsOrProvider: ClientProps | ClientPropsProvider, debug: DebugCallback = () => {}) => {
	const listeners: Record<string, { qos: QoS; callbacks: Set<{ callback: MessageCallback }> }> = {}
	const queue = new Set<{ topic: string; payload: string | Buffer; qos: QoS }>()

	let client: MqttClient | undefined
	let destroyed = false
	let connecting: Promise<void> | undefined
	let reconnecting: Promise<void> | undefined
	let retries = 0

	const disconnect = async () => {
		if (client) {
			debug('disconnect')
			const old = client
			client = undefined
			old.removeAllListeners()
			await old.endAsync(true).catch(() => {})
		}
	}

	const scheduleReconnect = () => {
		if (destroyed) return

		reconnecting ??= (async () => {
			const delay = Math.min(1000 * Math.pow(4, retries), 30 * 60 * 1000)
			retries++
			debug('reconnect', { attempt: retries, delay })
			await sleep(delay)
			reconnecting = undefined
			await connect()
		})()

		return reconnecting
	}

	const connect = () => {
		if (client || destroyed) return
		if (queue.size === 0 && Object.keys(listeners).length === 0) return

		connecting ??= (async () => {
			try {
				debug('connecting')
				const props = typeof propsOrProvider === 'function' ? await propsOrProvider() : propsOrProvider

				const local = await mqtt.connectAsync(props.endpoint, {
					...props,
					reconnectPeriod: 0,
					resubscribe: false,
				})

				client = local
				debug('connected', { topics: Object.keys(listeners).length })

				if (destroyed) {
					await disconnect()
					return
				}

				local.on('disconnect', async () => {
					debug('event:disconnect')
					await disconnect()
					scheduleReconnect()
				})

				local.on('close', () => {
					debug('event:close')
					if (client === local) {
						client = undefined
					}
					scheduleReconnect()
				})

				local.on('error', err => {
					debug('event:error', err)
				})

				local.on('message', (topic, payload) => {
					const entry = listeners[topic]

					if (entry) {
						for (const listener of entry.callbacks) {
							listener.callback(payload)
						}
					}
				})

				await local.subscribeAsync(Object.keys(listeners), { qos: QoS.AtLeastOnce })

				await Promise.all([
					...[...queue].map(async msg => {
						await local.publishAsync(msg.topic, msg.payload, { qos: msg.qos })
						queue.delete(msg)
					}),
				])

				retries = 0
			} catch (err) {
				debug('connect:error', err)
				client = undefined
				scheduleReconnect()
			} finally {
				connecting = undefined
			}
		})()

		return connecting
	}

	return {
		get connected() {
			return client?.connected ?? false
		},
		get topics() {
			return Object.keys(listeners)
		},
		async destroy() {
			debug('destroy')
			destroyed = true
			reconnecting = undefined
			await disconnect()
		},
		async publish(topic: string, payload: string | Buffer, qos: QoS = QoS.AtMostOnce) {
			if (client) {
				await client.publishAsync(topic, payload, { qos })
			} else {
				queue.add({ topic, payload, qos })
				await connect()
			}
		},
		async subscribe(topic: string, callback: MessageCallback, qos: QoS = QoS.AtMostOnce): Promise<Unsubscribe> {
			const listener = { callback }
			const entry = (listeners[topic] = listeners[topic] ?? { qos, callbacks: new Set() })

			entry.callbacks.add(listener)

			if (client) {
				if (entry.callbacks.size === 1) {
					await client.subscribeAsync(topic, { qos })
				}
			} else {
				await connect()
			}

			return async () => {
				entry.callbacks.delete(listener)

				if (entry.callbacks.size === 0) {
					delete listeners[topic]
					await client?.unsubscribeAsync(topic)
				}

				if (Object.keys(listeners).length === 0) {
					await disconnect()
				}
			}
		},
	}
}
