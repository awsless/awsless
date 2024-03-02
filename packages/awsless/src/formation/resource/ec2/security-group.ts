import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'
import { Port } from './port.js'
import { Peer } from './peer.js'

export type SecurityGroupProps = {
	vpcId: string
	name?: string
	description: string
}

type Rule = {
	peer: Peer
	port: Port
	description?: string
}

export class SecurityGroup extends Resource {
	readonly name: string

	private ingress: Rule[] = []
	private egress: Rule[] = []

	constructor(logicalId: string, private props: SecurityGroupProps) {
		super('AWS::EC2::SecurityGroup', logicalId)
		this.name = formatName(props.name ?? logicalId)
	}

	get id() {
		return this.ref()
	}

	addIngressRule(peer: Peer, port: Port, description?: string) {
		this.ingress.push({
			peer,
			port,
			description,
		})

		return this
	}

	addEgressRule(peer: Peer, port: Port, description?: string) {
		this.egress.push({
			peer,
			port,
			description,
		})

		return this
	}

	protected properties() {
		return {
			VpcId: this.props.vpcId,
			GroupName: this.name,
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
			})),
		}
	}
}
