import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types'
import { ListenerAction } from './listener-action'
import { ListenerCondition } from './listener-condition'

export class ListenerRule extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			listenerArn: Input<ARN>
			priority: Input<number>
			conditions: Input<Input<ListenerCondition>[]>
			actions: Input<Input<ListenerAction>[]>
		}
	) {
		super('AWS::ElasticLoadBalancingV2::ListenerRule', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.RuleArn)
	}

	toState() {
		return {
			document: {
				ListenerArn: this.props.listenerArn,
				Priority: this.props.priority,
				Conditions: unwrap(this.props.conditions)
					.map(v => unwrap(v))
					.map(condition => condition.toJSON()),
				Actions: unwrap(this.props.actions)
					.map(v => unwrap(v))
					.map((action, i) => {
						return {
							Order: i + 1,
							...action.toJSON(),
						}
					}),
			},
		}
	}
}
