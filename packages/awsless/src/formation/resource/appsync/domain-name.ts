import { Resource } from "../../resource"
import { getAtt } from "../../util"

export class DomainName extends Resource {
	constructor(logicalId: string, private props: {
		domainName: string
		certificateArn: string
	}) {
		super('AWS::AppSync::DomainName', logicalId)
	}

	get appSyncDomainName() {
		return getAtt(this.logicalId, 'AppSyncDomainName')
	}

	get domainName() {
		return getAtt(this.logicalId, 'DomainName')
	}

	get hostedZoneId() {
		return getAtt(this.logicalId, 'HostedZoneId')
	}

	properties() {
		return {
			DomainName: this.props.domainName,
			CertificateArn: this.props.certificateArn,
		}
	}
}

export class DomainNameApiAssociation extends Resource {
	constructor(logicalId: string, private props: {
		apiId: string
		domainName: string
	}) {
		super('AWS::AppSync::DomainNameApiAssociation', logicalId)
	}

	properties() {
		return {
			ApiId: this.props.apiId,
			DomainName: this.props.domainName,
		}
	}
}
