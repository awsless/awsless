import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	GetSubscriptionAttributesCommand,
	SNSClient,
	SubscribeCommand,
	UnsubscribeCommand,
} from '@aws-sdk/client-sns'
import { ARN } from '../types'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	TopicArn: ARN
	Protocol: string
	Endpoint: string | ARN
}

export class SubscriptionProvider implements CloudProvider {
	protected client: SNSClient

	constructor(props: ProviderProps) {
		this.client = new SNSClient(props)
	}

	own(id: string) {
		return id === 'aws-sns-subscription'
	}

	async get({ id }: GetProps<Document>) {
		const result = await this.client.send(
			new GetSubscriptionAttributesCommand({
				SubscriptionArn: id,
			})
		)

		return result.Attributes
	}

	async create({ document }: CreateProps<Document>) {
		const result = await this.client.send(
			new SubscribeCommand({
				...document,
				ReturnSubscriptionArn: true,
			})
		)

		return result.SubscriptionArn!
	}

	async update({}: UpdateProps<Document>) {
		throw new Error(`SNS Subscription can't be changed after creation.`)
		return ''
	}

	async delete({ id }: DeleteProps<Document>) {
		await this.client.send(
			new UnsubscribeCommand({
				SubscriptionArn: id,
			})
		)
	}
}
