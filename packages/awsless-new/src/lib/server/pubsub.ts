import { publish, QoS } from '@awsless/iot'
import { APP } from './util.js'

export const getPubSubTopic = <N extends string>(name: N) => {
	return `${APP}/pubsub/${name}` as const
}

export { QoS }

export type PublishOptions = {
	qos?: QoS
}

export const PubSub = {
	async publish(topic: string, event: string, payload: unknown, opts: PublishOptions = {}) {
		await publish({
			topic: getPubSubTopic(topic),
			payload: Buffer.from(JSON.stringify([event, payload])),
			...opts,
		})
	},
}
