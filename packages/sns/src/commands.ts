import { PublishCommand } from '@aws-sdk/client-sns'
import { snsClient } from './client'
import { Attributes, FormattedAttributes, PublishOptions } from './types'

const formatAttributes = (attributes: Attributes) => {
	const list: FormattedAttributes = {}
	for (let key in attributes) {
		list[key] = {
			DataType: 'String',
			StringValue: attributes[key]!,
		}
	}

	return list
}

export const publish = async ({
	client = snsClient(),
	topic,
	subject,
	payload,
	attributes = {},
	region = process.env.AWS_REGION,
	accountId = process.env.AWS_ACCOUNT_ID,
}: PublishOptions) => {
	const command = new PublishCommand({
		TopicArn: `arn:aws:sns:${region}:${accountId}:${topic}`,
		Subject: subject,
		Message: payload,
		MessageAttributes: formatAttributes({
			topic,
			...attributes,
		}),
	})

	await client.send(command)
}
