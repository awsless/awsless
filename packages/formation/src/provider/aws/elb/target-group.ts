import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types'

export class TargetGroup extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			type: Input<'lambda'>
			targets: Input<Input<ARN>[]>
		}
	) {
		super('AWS::ElasticLoadBalancingV2::TargetGroup', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.TargetGroupArn)
	}

	get fullName() {
		return this.output<string>(v => v.TargetGroupFullName)
	}

	toState() {
		return {
			document: {
				Name: this.props.name,
				TargetType: this.props.type,
				Targets: unwrap(this.props.targets).map(target => ({
					Id: target,
				})),
			},
		}
	}
}
