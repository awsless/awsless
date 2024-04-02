import { Input } from '../../../core/output'
import { Resource } from '../../../core/resource'
import { ARN } from '../types'

export type CertificateValidationProps = {
	certificateArn: Input<ARN>
	region?: Input<string>
}

export class CertificateValidation extends Resource {
	cloudProviderId = 'aws-acm-certificate-validation'

	constructor(id: string, private props: CertificateValidationProps) {
		super('AWS::CertificateManager::CertificateValidation', id, props)

		// This resource isn't a real resource.
		// So we can just skip the deletion part.

		this.deletionPolicy = 'retain'
	}

	get arn() {
		return this.output<ARN>(v => v.CertificateArn)
	}

	toState() {
		return {
			extra: {
				region: this.props.region,
			},
			document: {
				CertificateArn: this.props.certificateArn,
			},
		}
	}
}
