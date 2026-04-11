import { constantCase } from 'change-case'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Input, unwrap } from '../../../core/output.js'
import { Record } from '../route53/record-set.js'
import { minutes } from '@awsless/duration'
import { Node } from '../../../core/node.js'

export class EmailIdentity extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
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
		super(parent, 'AWS::SES::EmailIdentity', id, props)
	}

	// get arn() {
	// 	return this.output(() => `arn:aws:ses:eu-west-1:468004125411:identity/${this.props.emailIdentity}`)
	// }

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

	get dkimRecords(): Record[] {
		const ttl = minutes(5)

		return this.dkimDnsTokens.map(token => ({
			name: token.apply(token => token.name),
			type: 'CNAME' as const,
			ttl,
			records: [token.apply(token => token.value)],
		}))
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
