
import { Resource } from "../../resource";
import { ref } from "../../util";

export type CertificateProps = {
	domainName?: string
	alternativeNames?: string[]
}

export class Certificate extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: CertificateProps = {}) {
		super('AWS::CertificateManager::Certificate', logicalId)
		this.name = this.props.domainName || logicalId
	}

	get arn() {
		return ref(this.logicalId)
	}

	properties() {
		return {
			DomainName: this.name,
			ValidationMethod: 'DNS',
			SubjectAlternativeNames: this.props.alternativeNames || []
		}
	}
}
