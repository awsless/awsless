import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane'

export interface PublishOptions {
	client?: IoTDataPlaneClient
	topic: string
	id?: string | number
	event: string
	value?: any
	qos?: 0 | 1 | 2
}

export interface Payload {
	i?: string | number
	e: string
	v: any
}
