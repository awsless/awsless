import { Group } from "../../../resource"
import { Subscription } from "../../sns/subscription"
import { Function } from "../function"
import { Permission } from "../permission"

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
