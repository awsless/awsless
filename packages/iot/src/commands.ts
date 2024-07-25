import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'
import { iotClient } from './client'
// import { Payload, PublishOptions } from './types'

// export const publish = async ({ client = iotClient(), topic, id, event, value, qos = 0 }: PublishOptions) => {
// 	const payload: Payload = {
// 		e: event,
// 		v: value,
// 	}

// 	if (id) {
// 		payload.i = id
// 	}

// 	const command = new PublishCommand({
// 		qos,
// 		topic,
// 		payload: Buffer.from(JSON.stringify(payload)),
// 	})

// 	await client.send(command)
// }

export enum QoS {
	AtMostOnce = 0,
	AtLeastOnce = 1,
	ExactlyOnce = 2,
}

export type PublishProps = {
	client?: IoTDataPlaneClient
	topic: string
	// event: string
	// id?: string | number
	payload?: Uint8Array
	qos?: QoS
	retain?: boolean
	// correlationData?: string
	contentType?: string
}

export const publish = async ({ client = iotClient(), ...props }: PublishProps) => {
	const command = new PublishCommand(props)

	await client.send(command)
}

// publish({
// 	qos: QoS.AtLeastOnce
// })
