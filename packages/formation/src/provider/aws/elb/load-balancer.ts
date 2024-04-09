import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export class LoadBalancer extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			securityGroups: Input<Input<string>[]>
			subnets: Input<Input<string>[]>
			type: Input<'application' | 'gateway' | 'network'>
			schema?: Input<'internal' | 'internet-facing'>
		}
	) {
		super('AWS::ElasticLoadBalancingV2::LoadBalancer', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.LoadBalancerArn)
	}

	get name() {
		return this.output<string>(v => v.LoadBalancerName)
	}

	get dnsName() {
		return this.output<string>(v => v.DNSName)
	}

	get fullName() {
		return this.output<string>(v => v.LoadBalancerFullName)
	}

	get hostedZoneId() {
		return this.output<string>(v => v.CanonicalHostedZoneID)
	}

	toState() {
		return {
			document: {
				Name: this.props.name,
				Type: this.props.type,
				Scheme: unwrap(this.props.schema, 'internet-facing'),
				SecurityGroups: this.props.securityGroups,
				Subnets: this.props.subnets,
			},
		}
	}
}
