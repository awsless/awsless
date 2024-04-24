import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { Resource } from '../../../core/resource'
// import { Stack } from '../../../core/stack'
import { ARN } from '../types'

export type CertificateValidationProps = {
	certificateArn: Input<ARN>
	region?: Input<string>
}

export class CertificateValidation extends Resource {
	cloudProviderId = 'aws-acm-certificate-validation'

	constructor(readonly parent: Node, id: string, private props: CertificateValidationProps) {
		super(parent, 'AWS::CertificateManager::CertificateValidation', id, props)

		// This resource isn't a real resource.
		// So we can just skip the deletion part.

		this.deletionPolicy = 'retain'
	}

	get arn() {
		return this.output<ARN>(v => v.CertificateArn)
	}

	toState() {
		return {
			document: {
				Region: this.props.region,
				CertificateArn: this.props.certificateArn,
			},
		}
	}
}
