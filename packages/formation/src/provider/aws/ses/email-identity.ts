import { constantCase } from 'change-case'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Input, unwrap } from '../../../core/output.js'
import { Record, RecordType } from '../route53/record-set.js'
import { minutes } from '@awsless/duration'

export class EmailIdentity extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			emailIdentity: Input<string>
			feedback?: Input<boolean>
			configurationSetName?: Input<string>
			dkim?: Input<'rsa-1024-bit' | 'rsa-2048-bit'>
			rejectOnMxFailure?: Input<boolean>
			mailFromDomain?: Input<string>
		}
	) {
		super('AWS::SES::EmailIdentity', id, props)
	}

	private getDnsToken(index: 1 | 2 | 3) {
		return this.output<{ name: string; value: string }>(v => ({
			name: v[`DkimDNSTokenName${index}`],
			value: v[`DkimDNSTokenValue${index}`],
		}))
	}

	// get fullDomain() {
	// 	return `${this.props.subDomain}.${this.props.domain}`
	// }

	// get verifiedForSendingStatus() {
	// 	return
	// }

	get dkimDnsTokens() {
		return [
			//
			this.getDnsToken(1),
			this.getDnsToken(2),
			this.getDnsToken(3),
		]
	}

	dnsRecords(region: string): Record[] {
		const ttl = minutes(5)

		return [
			...this.dkimDnsTokens.map(token => ({
				name: token.apply(token => token.name),
				type: 'CNAME' as const,
				ttl,
				records: [token.apply(token => token.value)],
			})),
			{
				name: this.props.emailIdentity,
				type: 'TXT',
				ttl,
				records: ['"v=spf1 include:amazonses.com -all"'],
			},
			{
				name: this.props.emailIdentity,
				type: 'MX',
				ttl,
				records: [`10 feedback-smtp.${region}.amazonses.com.`],
			},
		]
	}

	toState() {
		return {
			document: {
				EmailIdentity: this.props.emailIdentity,
				...(this.props.configurationSetName
					? {
							ConfigurationSetAttributes: {
								ConfigurationSetName: this.props.configurationSetName,
							},
					  }
					: {}),
				...(this.props.dkim
					? {
							DkimAttributes: {
								SigningEnabled: true,
							},
							DkimSigningAttributes: {
								NextSigningKeyLength: constantCase(unwrap(this.props.dkim)),
							},
					  }
					: {}),
				FeedbackAttributes: {
					EmailForwardingEnabled: unwrap(this.props.feedback, false),
				},
				MailFromAttributes: {
					MailFromDomain: this.props.mailFromDomain,
					BehaviorOnMxFailure: unwrap(this.props.rejectOnMxFailure, true)
						? 'REJECT_MESSAGE'
						: 'USE_DEFAULT_VALUE',
				},
			},
		}
	}
}
