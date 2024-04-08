import { constantCase } from 'change-case'
import { CloudControlApiResource } from '../cloud-control-api'
import { Input, unwrap } from '../../../core/output'
import { ARN } from '../types'
import { ListenerAction } from './listener-action'

export class Listener extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			loadBalancerArn: Input<ARN>
			port: Input<number>
			protocol: Input<'http' | 'https' | 'geneve' | 'tcp' | 'tcp-udp' | 'tls' | 'udp'>
			certificates: Input<Input<string>[]>
			defaultActions?: Input<Input<ListenerAction>[]>
		}
	) {
		super('AWS::ElasticLoadBalancingV2::Listener', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.ListenerArn)
	}

	toState() {
		return {
			document: {
				LoadBalancerArn: this.props.loadBalancerArn,
				Port: this.props.port,
				Protocol: constantCase(unwrap(this.props.protocol)),
				Certificates: unwrap(this.props.certificates).map(arn => ({
					CertificateArn: arn,
				})),
				...this.attr(
					'DefaultActions',
					this.props.defaultActions &&
						unwrap(this.props.defaultActions).map((action, i) => {
							return {
								Order: i + 1,
								...unwrap(action).toJSON(),
							}
						})
				),
			},
		}
	}
}
