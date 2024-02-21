import { Resource } from '../../resource.js'
import { formatName, getAtt, ref } from '../../util.js'

export type UserPoolDomainProps = {
	userPoolId: string
	domain: string
}

export class UserPoolDomain extends Resource {
	constructor(logicalId: string, private props: UserPoolDomainProps) {
		super('AWS::Cognito::UserPoolDomain', logicalId)
	}

	get domain() {
		return ref(this.logicalId)
	}

	get cloudFrontDistribution() {
		return getAtt(this.logicalId, 'CloudFrontDistribution')
	}

	properties() {
		return {
			UserPoolId: this.props.userPoolId,
			Domain: formatName(this.props.domain),
		}
	}
}
