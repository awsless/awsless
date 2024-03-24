import { Input } from '../../../resource/output'
import { Resource } from '../../../resource/resource'
import { ARN } from '../types'

export type CertificateValidationProps = {
	certificateArn: Input<ARN>
}

export class CertificateValidation extends Resource {
	cloudProviderId = 'aws-acm-certificate-validation'

	constructor(id: string, private props: CertificateValidationProps) {
		super('AWS::CertificateManager::CertificateValidation', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.CertificateArn)
	}

	// get issuer() {
	// 	return this.output<string>(v => v.Issuer)
	// }

	toState() {
		return {
			document: {
				CertificateArn: this.props.certificateArn,
			},
		}
	}
}
