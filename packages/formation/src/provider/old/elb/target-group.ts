import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export class TargetGroup extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			name?: string
			type: 'lambda'
			targets: string[]
		}
	) {
		super('AWS::ElasticLoadBalancingV2::TargetGroup', logicalId)
		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return this.ref()
	}

	get fullName() {
		return this.getAtt('TargetGroupFullName')
	}

	protected properties() {
		return {
			Name: this.name,
			TargetType: this.props.type,
			Targets: this.props.targets.map(target => ({
				Id: target,
			})),
		}
	}
}
