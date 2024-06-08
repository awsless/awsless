import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class InstanceConnectEndpoint extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			subnetId: Input<string>
			preserveClientIp?: Input<boolean>
			securityGroupIds?: Input<Input<string>[]>
			tags?: Input<Record<string, Input<string>>>
		}
	) {
		super(parent, 'AWS::EC2::InstanceConnectEndpoint', id, props)
	}

	get id() {
		return this.output<string>(v => v.InstanceConnectEndpointId)
	}

	toState() {
		return {
			document: {
				PreserveClientIp: this.props.preserveClientIp,
				SecurityGroupIds: this.props.securityGroupIds,
				SubnetId: this.props.subnetId,
				Tags: [
					{ Key: 'Name', Value: this.props.name },
					...Object.entries(unwrap(this.props.tags, {})).map(([k, v]) => ({
						Key: k,
						Value: v,
					})),
				],
			},
		}
	}
}
