
import { Resource } from "../../resource";
import { Stack } from "../../stack";
import { ref } from "../../util";
import { Port } from "../../property/port";
import { Peer } from "../../property/peer";

export type SecurityGroupProps = {
	vpcId: string
	description?: string
}

type Rule = {
	peer: Peer,
	port: Port,
	description?: string
}

export class SecurityGroup extends Resource {

	private ingress:Rule[] = []
	private egress:Rule[] = []

	constructor(readonly logicalId: string, private props: SecurityGroupProps) {
		super('ec2', 'security-group', logicalId)
	}

	get id() {
		return ref(`${ this.logicalId }SecurityGroup`)
	}

	addIngressRule(peer:Peer, port:Port, description?: string) {
		this.ingress.push({
			peer,
			port,
			description,
		})

		return this
	}

	addEgressRule(peer:Peer, port:Port, description?: string) {
		this.egress.push({
			peer,
			port,
			description,
		})

		return this
	}

	template(stack: Stack) {
		return {
			[ `${ this.logicalId }SecurityGroup` ]: {
				Type: 'AWS::EC2::SecurityGroup',
				Properties: {
					VpcId: this.props.vpcId,
					GroupName: stack.formatResourceName(this.logicalId),
					GroupDescription: this.props.description || '',
					SecurityGroupIngress: this.ingress.map(rule => ({
						Description: rule.description || '',
						...rule.port.toRuleJson(),
						...rule.peer.toRuleJson(),
					})),
					SecurityGroupEgress: this.egress.map(rule => ({
						Description: rule.description || '',
						...rule.port.toRuleJson(),
						...rule.peer.toRuleJson(),
					}))
				}
			},
		}
	}
}
