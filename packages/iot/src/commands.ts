import { PublishCommand } from '@aws-sdk/client-iot-data-plane'
import { iotClient } from './client'
import { Payload, PublishOptions } from './types'

export const publish = async ({ client = iotClient(), topic, id, event, value, qos = 0 }: PublishOptions) => {
	const payload: Payload = {
		e: event,
		v: value,
	}

	if (id) {
		payload.i = id
	}

	const command = new PublishCommand({
		qos,
		topic,
		payload: Buffer.from(JSON.stringify(payload)),
	})

	await client.send(command)
}
