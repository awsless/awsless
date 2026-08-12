import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'
import { ARN } from '../types.js'

export type SubscriptionProps = {
	topicArn: Input<ARN>
	protocol: Input<'lambda' | 'email'>
	endpoint: Input<string> | Input<ARN>
}

export class Subscription extends Resource {
	cloudProviderId = 'aws-sns-subscription'

	constructor(readonly parent: Node, id: string, private props: SubscriptionProps) {
		super(parent, 'AWS::SNS::Subscription', id, props)
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
