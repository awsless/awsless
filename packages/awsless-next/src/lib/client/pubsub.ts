import { parse, stringify } from '@awsless/json'
import { createClient, QoS } from '@awsless/mqtt'

type MessageCallback = (payload: any) => void

type ClientProps = {
	endpoint: string
	authorizer: string
	token?: string
}

type ClientPropsProvider = () => Promise<ClientProps> | ClientProps

export const createPubSubClient = (app: string, props: ClientProps | ClientPropsProvider) => {
	const mqtt = createClient(async () => {
		const config = typeof props === 'function' ? await props() : props

		return {
			endpoint: `wss://${config.endpoint}/mqtt`,
			username: `?x-amz-customauthorizer-name=${config.authorizer}`,
			password: config.token,
		}
	})

	const getPubSubTopic = (name: string) => {
		return `${app}/pubsub/${name}`
	}

	const fromPubSubTopic = (name: string) => {
		return name.replace(`${app}/pubsub/`, '')
	}

	return {
		...mqtt,
		get connected() {
			return mqtt.connected
		},
		get topics() {
			return mqtt.topics.map(fromPubSubTopic)
		},
		publish(topic: string, event: string, payload: unknown, qos: QoS) {
			return mqtt.publish(getPubSubTopic(topic), stringify([event, payload]), qos)
		},
		subscribe(topic: string, event: string, callback: MessageCallback) {
			return mqtt.subscribe(getPubSubTopic(topic), message => {
				const [eventName, payload] = parse(message.toString('utf8'))

				if (event === eventName) {
					callback(payload)
				}
			})
		},
	}
}
