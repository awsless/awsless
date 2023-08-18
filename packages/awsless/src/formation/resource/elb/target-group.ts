import { Resource } from "../../resource";
import { formatName, getAtt, ref } from "../../util";

export class TargetGroup extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		name?: string
		type: 'lambda'
		targets: string[]
	}) {
		super('AWS::ElasticLoadBalancingV2::TargetGroup', logicalId)
		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return ref(this.logicalId)
	}

	get fullName() {
		return getAtt(this.logicalId, 'TargetGroupFullName')
	}

	properties() {
		return {
			Name: this.name,
			TargetType: this.props.type,
			Targets: this.props.targets.map(target => ({
				Id: target,
			}))
		}
	}
}
