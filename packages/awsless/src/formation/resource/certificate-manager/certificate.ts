import { Resource } from '../../resource.js'
import { ref } from '../../util.js'

export type CertificateProps = {
	hostedZoneId: string
	domainName: string
	alternativeNames?: string[]
}

export class Certificate extends Resource {
	constructor(logicalId: string, private props: CertificateProps) {
		super('AWS::CertificateManager::Certificate', logicalId)
	}

	get arn() {
		return ref(this.logicalId)
	}

	protected properties() {
		return {
			DomainName: this.props.domainName,
			SubjectAlternativeNames: this.props.alternativeNames || [],
			ValidationMethod: 'DNS',
			DomainValidationOptions: [
				{
					DomainName: this.props.domainName,
					HostedZoneId: this.props.hostedZoneId,
				},
			],
		}
	}
}
