import { Resource } from '../../resource.js'

export type SubscriptionProps = {
	topicArn: string
	protocol: 'lambda' | 'email'
	endpoint: string
}

export class Subscription extends Resource {
	constructor(logicalId: string, private props: SubscriptionProps) {
		super('AWS::SNS::Subscription', logicalId)
	}

	protected properties() {
		return {
			TopicArn: this.props.topicArn,
			Protocol: this.props.protocol,
			Endpoint: this.props.endpoint,
		}
	}
}
