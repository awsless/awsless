
import { Group } from "../../../resource"
import { formatName, sub } from "../../../util"
import { ListenerAction } from "../../elb/listener"
import { ListenerCondition, ListenerRule } from "../../elb/listener-rule"
import { TargetGroup } from "../../elb/target-group"
import { Function } from "../function"
import { Permission } from "../permission"

export class ElbEventSource extends Group {
	constructor(id: string, lambda:Function, props: {
		listenerArn: string
		priority: number
		conditions: ListenerCondition[]
	}) {
		const name = formatName(id)
		const permission = new Permission(id, {
			action: 'lambda:InvokeFunction',
			principal: 'elasticloadbalancing.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: sub('arn:${AWS::Partition}:elasticloadbalancing:${AWS::Region}:${AWS::AccountId}:targetgroup/${name}/*', {
				name,
			})
		}).dependsOn(lambda)

		const target = new TargetGroup(id, {
			name,
			type: 'lambda',
			targets: [ lambda.arn ]
		}).dependsOn(lambda, permission)

		const rule = new ListenerRule(id, {
			listenerArn: props.listenerArn,
			priority: props.priority,
			conditions: props.conditions,
			actions: [
				ListenerAction.forward([ target.arn ]),
			],
		}).dependsOn(target)

		super([ target, rule, permission ])
	}
}
