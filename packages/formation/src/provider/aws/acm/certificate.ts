import { Input, unwrap } from '../../../resource/output'
import { Resource } from '../../../resource/resource'
import { ARN } from '../types'
import { CertificateValidation } from './certificate-validation'

export type KeyAlgorithm =
	| 'RSA_1024'
	| 'RSA_2048'
	| 'RSA_3072'
	| 'RSA_4096'
	| 'EC_prime256v1'
	| 'EC_secp384r1'
	| 'EC_secp521r1'

export type CertificateProps = {
	domainName: Input<string>
	alternativeNames?: Input<Input<string>[]>
	region?: Input<string>
	keyAlgorithm?: Input<KeyAlgorithm>
	validationMethod?: Input<'dns' | 'email'>
	validationOptions?: Input<
		Input<{
			domainName: Input<string>
			validationDomain: Input<string>
			// hostedZoneId?: Input<string>
		}>[]
	>
}

export class Certificate extends Resource {
	cloudProviderId = 'aws-acm-certificate'

	private validation: CertificateValidation | undefined

	constructor(id: string, private props: CertificateProps) {
		super('AWS::CertificateManager::Certificate', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.CertificateArn)
	}

	get issuer() {
		return this.output<string>(v => v.Issuer)
	}

	get issuedArn() {
		if (!this.validation) {
			this.validation = new CertificateValidation('validation', {
				certificateArn: this.arn,
			})

			this.add(this.validation)
		}

		return this.validation.arn
	}

	toState() {
		return {
			extra: {
				region: this.props.region,
			},
			document: {
				DomainName: this.props.domainName,
				...(this.props.alternativeNames
					? {
							SubjectAlternativeNames: unwrap(this.props.alternativeNames, []),
					  }
					: {}),
				ValidationMethod: unwrap(this.props.validationMethod, 'dns').toUpperCase(),
				KeyAlgorithm: this.props.keyAlgorithm,
				...(this.props.validationOptions
					? {
							DomainValidationOptions: unwrap(this.props.validationOptions)
								.map(v => unwrap(v))
								.map(options => ({
									DomainName: options.domainName,
									ValidationDomain: options.validationDomain,
									// HostedZoneId: options.hostedZoneId,
								})),
					  }
					: {}),
			},
		}
	}
}
