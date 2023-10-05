import { SNSClient } from '@aws-sdk/client-sns'

export type Attributes = { [key: string]: string }

export type FormattedAttributes = {
	[key: string]: {
		DataType: 'String'
		StringValue: string
	}
}

export interface PublishOptions<Payload = unknown> {
	client?: SNSClient

	topic: string
	subject?: string
	payload?: Payload
	attributes?: Attributes

	region?: string
	accountId?: string
}
