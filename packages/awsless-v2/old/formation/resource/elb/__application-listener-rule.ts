import { Resource } from '../../resource.js';
import { getAtt, ref } from '../../util.js';

export class LoadBalancer extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		name?: string
		securtyGroups: string[]
		subnets: string[]
		type: 'application' | 'gateway' | 'network'
		schema?: 'internal' | 'internet-facing'
	}) {
		super('AWS::ElasticLoadBalancingV2::LoadBalancer', logicalId)
		this.name = this.props.name || logicalId
	}

	get id() {
		return ref(this.logicalId)
	}

	get dnsName() {
		return getAtt(this.logicalId, 'DNSName')
	}

	get hostedZoneId() {
		return getAtt(this.logicalId, 'CanonicalHostedZoneID')
	}

	properties() {
		return {
			Name: this.name,
			Type: this.props.type,
			Scheme: this.props.schema || 'internet-facing',
			SecurityGroups: this.props.securtyGroups,
			Subnets: this.props.subnets,
		}
	}
}
