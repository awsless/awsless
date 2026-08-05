import { Resource } from '../../resource.js'

export class DomainName extends Resource {
	constructor(
		logicalId: string,
		private props: {
			name: string
			certificateArn: string
		}
	) {
		super('AWS::ApiGatewayV2::DomainName', logicalId)
	}

	get name() {
		return this.ref()
	}

	get regionalDomainName() {
		return this.getAtt('RegionalDomainName')
	}

	get regionalHostedZoneId() {
		return this.getAtt('RegionalHostedZoneId')
	}

	protected properties() {
		return {
			DomainName: this.props.name,
			DomainNameConfigurations: [
				{
					CertificateArn: this.props.certificateArn,
				},
			],
		}
	}
}
