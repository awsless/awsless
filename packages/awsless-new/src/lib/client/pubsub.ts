import { createClient, QoS } from '@awsless/mqtt'

type MessageCallback = (payload: any) => void

type ClientProps = {
	endpoint: string
	authorizer: string
	token?: string
}

type ClientPropsProvider = () => Promise<ClientProps> | ClientProps

export const createPubSubClient = (props: ClientProps | ClientPropsProvider) => {
	const mqtt = createClient(async () => {
		const config = typeof props === 'function' ? await props() : props

		return {
			endpoint: `wss://${config.endpoint}/mqtt`,
			username: `?x-amz-customauthorizer-name=${config.authorizer}`,
			password: config.token,
		}
	})

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
