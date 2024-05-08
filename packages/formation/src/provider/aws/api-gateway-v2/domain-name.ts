import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types'

export class DomainName extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			certificates: Input<
				Input<{
					certificateArn?: Input<ARN>
					certificateName?: Input<string>
					endpointType?: Input<string>
					securityPolicy?: Input<'TLS_1_2' | 'TLS_1_0'>
				}>[]
			>
		}
	) {
		super(parent, 'AWS::ApiGatewayV2::DomainName', id, props)
	}

	get name() {
		return this.output(v => v.DomainName)
	}

	get regionalDomainName() {
		return this.output(v => v.RegionalDomainName)
	}

	get regionalHostedZoneId() {
		return this.output(v => v.RegionalHostedZoneId)
	}

	toState() {
		return {
			document: {
				DomainName: this.props.name,
				DomainNameConfigurations: unwrap(this.props.certificates)
					.map(v => unwrap(v))
					.map(item => ({
						...this.attr('CertificateArn', item.certificateArn),
						...this.attr('CertificateName', item.certificateName),
						...this.attr('EndpointType', item.endpointType),
						...this.attr('SecurityPolicy', item.securityPolicy),
					})),
			},
		}
	}
}
