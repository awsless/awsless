import { ClientProps, createClient, QoS } from '@awsless/mqtt'

type MessageCallback = (payload: any) => void

export const createPubSubClient = (props: ClientProps) => {
	const mqtt = createClient(props)

	return {
		...mqtt,
		publish(topic: string, event: string, payload: unknown, qos: QoS) {
			return mqtt.publish(topic, JSON.stringify([event, payload]), qos)
		},
		subscribe(topic: string, event: string, callback: MessageCallback) {
			return mqtt.subscribe(topic, message => {
				const [eventName, payload] = JSON.parse(message.toString('utf8'))

				if (event === eventName) {
					callback(payload)
				}
			})
		},
	}
}
