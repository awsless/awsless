import { Port } from './port.js'
import { Peer } from './peer.js'
import { Input, unwrap } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'

export class SecurityGroupRule extends Resource {
	cloudProviderId = 'aws-ec2-security-group-rule'

	constructor(
		id: string,
		private props: {
			securityGroupId: Input<string>
			type: Input<'egress' | 'ingress'>
			peer: Input<Peer>
			port: Input<Port>
			description?: Input<string>
		}
	) {
		super('AWS::EC2::SecurityGroupRule', id, props)
	}

	toState() {
		return {
			document: {
				SecurityGroupId: this.props.securityGroupId,
				Type: this.props.type,
				Description: unwrap(this.props.description, ''),
				...unwrap(this.props.port).toRuleJson(),
				...unwrap(this.props.peer).toRuleJson(),
			},
		}
	}
}
