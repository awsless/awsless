
import { Group } from '../../../resource.js'
import { formatName, sub } from '../../../util.js'
import { ListenerAction } from '../../elb/listener.js'
import { ListenerCondition, ListenerRule } from '../../elb/listener-rule.js'
import { TargetGroup } from '../../elb/target-group.js'
import { Function } from '../function.js'
import { Permission } from '../permission.js'

export class ElbEventSource extends Group {
	constructor(id: string, lambda:Function, props: {
		listenerArn: string
		priority: number
		conditions: ListenerCondition[]
		auth?: {
			cognito?: {
				userPool: {
					arn: string
					clientId: string
					domain: string
				}
			}
		}
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

		const actions:ListenerAction[] = []

		if(props.auth?.cognito) {
			actions.push(ListenerAction.authCognito(props.auth.cognito))
		}

		const rule = new ListenerRule(id, {
			listenerArn: props.listenerArn,
			priority: props.priority,
			conditions: props.conditions,
			actions: [
				...actions,
				ListenerAction.forward([ target.arn ]),
			],
		}).dependsOn(target)

		super([ target, rule, permission ])
	}
}
