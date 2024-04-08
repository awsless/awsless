import { Input, unwrap } from '../../../core/output'
import { Resource } from '../../../core/resource'
import { Record, RecordType } from '../route53/record-set'
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

		// It should be safe for certificates to be deleted after a deployment
		// because multiple certificates can exist for a single domain.

		this.deletionPolicy = 'after-deployment'
	}

	get arn() {
		return this.output<ARN>(v => v.CertificateArn)
	}

	get issuer() {
		return this.output<string>(v => v.Issuer)
	}

	validationRecord(index: number) {
		// return {
		// 	name: this.output<string>(v => v.DomainValidationOptions.at(index).ResourceRecord.Name),
		// 	type: this.output<RecordType>(v => v.DomainValidationOptions.at(index).ResourceRecord.Type),
		// 	records: [this.output<string>(v => v.DomainValidationOptions.at(index).ResourceRecord.Value)],
		// }

		return this.output<Record>(v => {
			const record = v.DomainValidationOptions.at(index).ResourceRecord

			return {
				name: record.Name,
				type: record.Type,
				records: [record.Value],
			} satisfies Record
		})
	}

	get validationRecords() {
		return this.output<Record[]>(v =>
			v.DomainValidationOptions.map(opt => {
				const record = opt.ResourceRecord
				return {
					name: record.Name,
					type: record.Type,
					records: [record.Value],
				} satisfies Record
			})
		)
	}

	get issuedArn() {
		if (!this.validation) {
			this.validation = new CertificateValidation('validation', {
				certificateArn: this.arn,
				region: this.props.region,
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
				KeyAlgorithm: unwrap(this.props.keyAlgorithm, 'RSA_2048'),
				...(this.props.validationOptions
					? {
							DomainValidationOptions: unwrap(this.props.validationOptions)
								.map(v => unwrap(v))
								.map(options => ({
									DomainName: options.domainName,
									ValidationDomain: options.validationDomain,
									// HostedZoneId: options.hostedZoneId,
									// HostedZoneId: 'Z0157889170MJQ0XTIRZD',
								})),
					  }
					: {}),
			},
		}
	}
}
