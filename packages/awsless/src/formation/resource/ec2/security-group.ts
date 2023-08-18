
import { Resource } from "../../resource";
import { ref } from "../../util";
import { Port } from "./port";
import { Peer } from "./peer";

export type SecurityGroupProps = {
	vpcId: string
	description: string
}

type Rule = {
	peer: Peer,
	port: Port,
	description?: string
}

export class SecurityGroup extends Resource {

	private ingress:Rule[] = []
	private egress:Rule[] = []

	constructor(logicalId: string, private props: SecurityGroupProps) {
		super('AWS::EC2::SecurityGroup', logicalId)
	}

	get id() {
		return ref(this.logicalId)
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

	properties() {
		return {
			VpcId: this.props.vpcId,
			GroupName: this.logicalId,
			GroupDescription: this.props.description,
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
	}
}
