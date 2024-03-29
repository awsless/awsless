import { Port } from './port.js'
import { Peer } from './peer.js'
import { Input, unwrap } from '../../../resource/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

type Rule = {
	peer: Input<Peer>
	port: Input<Port>
	description?: Input<string>
}

export class SecurityGroup extends CloudControlApiResource {
	private ingress: Input<Rule>[] = []
	private egress: Input<Rule>[] = []

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

	addIngressRule(rule: Input<Rule>) {
		this.ingress.push(rule)
		return this
	}

	addEgressRule(rule: Input<Rule>) {
		this.egress.push(rule)
		return this
	}

	toState() {
		return {
			document: {
				VpcId: this.props.vpcId,
				GroupName: this.props.name,
				GroupDescription: this.props.description,
				SecurityGroupEgress: this.egress
					.map(rule => unwrap(rule))
					.map(rule => ({
						...unwrap(rule.peer).toRuleJson(),
						...unwrap(rule.port).toRuleJson(),
						Description: unwrap(rule.description, ''),
					})),

				SecurityGroupIngress: this.ingress
					.map(rule => unwrap(rule))
					.map(rule => ({
						...unwrap(rule.peer).toRuleJson(),
						...unwrap(rule.port).toRuleJson(),
						Description: unwrap(rule.description, ''),
					})),
			},
		}
	}
}
