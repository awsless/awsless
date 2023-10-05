import { Group } from '../../../resource.js'
import { Subscription } from '../../sns/subscription.js'
import { Function } from '../function.js'
import { Permission } from '../permission.js'

export class SnsEventSource extends Group {
	constructor(id: string, lambda:Function, props: {
		topicArn: string
	}) {
		const topic = new Subscription(id, {
			topicArn: props.topicArn,
			protocol: 'lambda',
			endpoint: lambda.arn,
		})

		const permission = new Permission(id, {
			action: 'lambda:InvokeFunction',
			principal: 'sns.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: props.topicArn,
		})

		super([ topic, permission ])
	}
}
