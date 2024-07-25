import { constantCase } from 'change-case'
import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types'

export type DomainConfigurationProps = {
	name: Input<string>
	domainName: Input<string>
	enabled?: Input<boolean>
	type?: Input<'data' | 'credential-provider' | 'jobs'>
	certificates?: Input<Input<ARN>[]>
	validationCertificate?: Input<ARN>
	enableOCSP?: Input<boolean>
	authorizer?: Input<{
		name: Input<string>
		allowOverride?: Input<boolean>
	}>

	tags?: Input<Record<string, Input<string>>>
}

export class DomainConfiguration extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: DomainConfigurationProps
	) {
		super(parent, 'AWS::IoT::DomainConfiguration', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	toState() {
		return {
			document: {
				DomainConfigurationName: this.props.name,
				DomainConfigurationStatus: unwrap(this.props.enabled, true) ? 'ENABLED' : 'DISABLED',
				DomainName: this.props.domainName,
				ServiceType: constantCase(unwrap(this.props.type, 'data')),
				...this.attr('ValidationCertificateArn', this.props.validationCertificate),
				...this.attr('ServerCertificateArns', this.props.certificates),
				ServerCertificateConfig: {
					EnableOCSPCheck: unwrap(this.props.enableOCSP, false),
				},

				...(this.props.authorizer
					? {
							AuthorizerConfig: {
								DefaultAuthorizerName: unwrap(this.props.authorizer).name,
								AllowAuthorizerOverride: unwrap(unwrap(this.props.authorizer).allowOverride, false),
							},
						}
					: {}),

				// TlsConfig: {
				// 	SecurityPolicy: {

				// 	}
				// },

				Tags: Object.entries(unwrap(this.props.tags, {})).map(([k, v]) => ({
					Key: k,
					Value: v,
				})),
			},
		}
	}
}
