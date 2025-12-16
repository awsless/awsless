import { Resource } from '../../resource.js'

export class LoadBalancer extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			name?: string
			securityGroups: string[]
			subnets: string[]
			type: 'application' | 'gateway' | 'network'
			schema?: 'internal' | 'internet-facing'
		}
	) {
		super('AWS::ElasticLoadBalancingV2::LoadBalancer', logicalId)
		this.name = this.props.name || logicalId
	}

	get arn() {
		return this.ref()
	}

	get dnsName() {
		return this.getAtt('DNSName')
	}

	get hostedZoneId() {
		return this.getAtt('CanonicalHostedZoneID')
	}

	protected properties() {
		return {
			Name: this.name,
			Type: this.props.type,
			Scheme: this.props.schema || 'internet-facing',
			SecurityGroups: this.props.securityGroups,
			Subnets: this.props.subnets,
		}
	}
}
