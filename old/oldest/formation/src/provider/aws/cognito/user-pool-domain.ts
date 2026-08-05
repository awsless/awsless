import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export type UserPoolDomainProps = {
	userPoolId: Input<string>
	domain: Input<string>
}

export class UserPoolDomain extends CloudControlApiResource {
	constructor(readonly parent: Node, id: string, private props: UserPoolDomainProps) {
		super(parent, 'AWS::Cognito::UserPoolDomain', id, props)
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
