
import { Resource } from '../../resource.js';
import { ref } from '../../util.js';

export type CertificateProps = {
	hostedZoneId: string
	domainName?: string
	alternativeNames?: string[]
}

export class Certificate extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: CertificateProps) {
		super('AWS::CertificateManager::Certificate', logicalId)
		this.name = this.props.domainName || logicalId
	}

	get arn() {
		return ref(this.logicalId)
	}

	properties() {
		return {
			DomainName: this.name,
			SubjectAlternativeNames: this.props.alternativeNames || [],
			ValidationMethod: 'DNS',
			DomainValidationOptions: [{
				DomainName: this.name,
				HostedZoneId: this.props.hostedZoneId
			}]
		}
	}
}
