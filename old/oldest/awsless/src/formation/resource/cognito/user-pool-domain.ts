import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export type UserPoolDomainProps = {
	userPoolId: string
	domain: string
}

export class UserPoolDomain extends Resource {
	constructor(logicalId: string, private props: UserPoolDomainProps) {
		super('AWS::Cognito::UserPoolDomain', logicalId)
	}

	get domain() {
		return this.ref()
	}

	get cloudFrontDistribution() {
		return this.getAtt('CloudFrontDistribution')
	}

	protected properties() {
		return {
			UserPoolId: this.props.userPoolId,
			Domain: formatName(this.props.domain),
		}
	}
}
