import { SQSClient } from '@aws-sdk/client-sqs'

export type Attributes = {
	[key: string]: string
}

export interface SendMessageOptions<Payload = unknown> {
	client?: SQSClient
	queue: string
	payload?: Payload
	delay?: number
	attributes?: Attributes
}

export interface SendMessageBatchOptions<Payload = unknown> {
	client?: SQSClient
	queue: string
	items: BatchItem<Payload>[]
}

export interface BatchItem<Payload = unknown> {
	payload?: Payload
	delay?: number
	attributes?: Attributes
}
