import { Input } from '../../../core/output.js'
import { AwsResource } from '../resource.js'
import { ARN } from '../types.js'

export type SubscriptionProps = {
	topicArn: Input<ARN>
	protocol: Input<'lambda' | 'email'>
	endpoint: Input<string>
}

export class Subscription extends AwsResource {
	constructor(id: string, private props: SubscriptionProps) {
		super('AWS::SNS::Subscription', id, props)
	}

	toState() {
		return {
			document: {
				TopicArn: this.props.topicArn,
				Protocol: this.props.protocol,
				Endpoint: this.props.endpoint,
			},
		}
	}
}
