import { Input } from '../../../resource/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export type UserPoolDomainProps = {
	userPoolId: Input<string>
	domain: Input<string>
}

export class UserPoolDomain extends CloudControlApiResource {
	constructor(id: string, private props: UserPoolDomainProps) {
		super('AWS::Cognito::UserPoolDomain', id, props)
	}

	// get domain() {
	// 	return this.ref()
	// }

	// get cloudFrontDistribution() {
	// 	return this.getAtt('CloudFrontDistribution')
	// }

	toState() {
		return {
			document: {
				UserPoolId: this.props.userPoolId,
				Domain: this.props.domain,
			},
		}
	}
}
