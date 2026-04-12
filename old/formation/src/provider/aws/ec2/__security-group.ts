import { Port } from './port.js'
import { Peer } from './peer.js'
import { Input } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'
import { SecurityGroupRule } from './__security-group-rule.js'

type Rule = {
	peer: Input<Peer>
	port: Input<Port>
	description?: Input<string>
}

export class SecurityGroup extends Resource {
	cloudProviderId = 'aws-ec2-security-group'

	// private ingress: Rule[] = []
	// private egress: Rule[] = []

	constructor(
		id: string,
		private props: {
			vpcId: Input<string>
			name: Input<string>
			description: Input<string>
		}
	) {
		super('AWS::EC2::SecurityGroup', id, props)
	}

	get id() {
		return this.output<string>(v => v.GroupId)
	}

	get name() {
		return this.output<string>(v => v.GroupName)
	}

	addIngressRule(id: string, props: Rule) {
		const rule = new SecurityGroupRule(id, {
			securityGroupId: this.id,
			type: 'ingress',
			...props,
		})

		this.add(rule)

		return this
	}

	addEgressRule(id: string, props: Rule) {
		const rule = new SecurityGroupRule(id, {
			securityGroupId: this.id,
			type: 'egress',
			...props,
		})

		this.add(rule)

		return this
	}

	toState() {
		return {
			document: {
				VpcId: this.props.vpcId,
				GroupName: this.props.name,
				GroupDescription: this.props.description,
			},
		}
	}
}
