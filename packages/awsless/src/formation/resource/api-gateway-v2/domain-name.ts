
import { Resource } from '../../resource.js';
import { getAtt, ref } from '../../util.js';

export class DomainName extends Resource {

	constructor(logicalId: string, private props: {
		name: string
		certificateArn: string
	}) {
		super('AWS::ApiGatewayV2::DomainName', logicalId)
	}

	get name() {
		return ref(this.logicalId)
	}

	get regionalDomainName() {
		return getAtt(this.logicalId, 'RegionalDomainName')
	}

	get regionalHostedZoneId() {
		return getAtt(this.logicalId, 'RegionalHostedZoneId')
	}

	properties() {
		return {
			DomainName: this.props.name,
			DomainNameConfigurations: [{
				CertificateArn: this.props.certificateArn,
			}]
		}
	}
}
