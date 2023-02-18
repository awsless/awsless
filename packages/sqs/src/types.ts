import { SQSClient } from '@aws-sdk/client-sqs'

export type Attributes = {
	[key: string]: string
}

export interface SendMessage {
	client?: SQSClient
	queue: string
	payload?: unknown
	delay?: number
	attributes?: Attributes
}

export interface SendMessageBatch {
	client?: SQSClient
	queue: string
	items: BatchItem[]
}

export interface BatchItem {
	payload?: unknown
	delay?: number
	attributes?: Attributes
}
