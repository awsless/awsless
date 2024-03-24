import { Resource } from '../../resource.js'

export class DomainName extends Resource {
	constructor(
		logicalId: string,
		private props: {
			domainName: string
			certificateArn: string
		}
	) {
		super('AWS::AppSync::DomainName', logicalId)
	}

	get appSyncDomainName() {
		return this.getAtt('AppSyncDomainName')
	}

	get domainName() {
		return this.getAtt('DomainName')
	}

	get hostedZoneId() {
		return this.getAtt('HostedZoneId')
	}

	protected properties() {
		return {
			DomainName: this.props.domainName,
			CertificateArn: this.props.certificateArn,
		}
	}
}

export class DomainNameApiAssociation extends Resource {
	constructor(
		logicalId: string,
		private props: {
			apiId: string
			domainName: string
		}
	) {
		super('AWS::AppSync::DomainNameApiAssociation', logicalId)
	}

	protected properties() {
		return {
			ApiId: this.props.apiId,
			DomainName: this.props.domainName,
		}
	}
}
