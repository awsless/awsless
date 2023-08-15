
import { Resource } from "../../resource";
import { ref } from "../../util";

export type CertificateProps = {
	domainName?: string
	alternativeNames?: string[]
}

export class Certificate extends Resource {
	readonly name: string

	constructor(readonly logicalId: string, private props: CertificateProps = {}) {
		super('certificate-manager', 'certificate', logicalId)
		this.name = this.props.domainName || this.logicalId
	}

	get arn() {
		return ref(`${ this.logicalId }Certificate`)
	}

	template() {
		return {
			[ `${ this.logicalId }Certificate` ]: {
				Type: 'AWS::CertificateManager::Certificate',
				Properties: {
					ValidationMethod: 'DNS',
					DomainName: this.name,
					SubjectAlternativeNames: this.props.alternativeNames || []
				}
			}
		}
	}
}
