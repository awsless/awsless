import { constantCase } from 'change-case'
import { Resource } from '../../resource.js'
import { getAtt, sub } from '../../util.js'
import { Record } from '../route53/record-set.js'
import { Duration } from '../../property/duration.js'

export class EmailIdentity extends Resource {
	constructor(
		logicalId: string,
		private props: {
			domain: string
			subDomain: string
			feedback?: boolean
			configurationSetName?: string
			dkim?: 'rsa-1024-bit' | 'rsa-2048-bit'
			rejectOnMxFailure?: boolean
		}
	) {
		super('AWS::SES::EmailIdentity', logicalId)
	}

	private getDnsToken(index: number) {
		return {
			name: getAtt(this.logicalId, 'DkimDNSTokenName' + index),
			value: getAtt(this.logicalId, 'DkimDNSTokenValue' + index),
		}
	}

	get fullDomain() {
		return `${this.props.subDomain}.${this.props.domain}`
	}

	get dkimDnsToken1() {
		return this.getDnsToken(1)
	}

	get dkimDnsToken2() {
		return this.getDnsToken(2)
	}

	get dkimDnsToken3() {
		return this.getDnsToken(3)
	}

	get records(): Record[] {
		const tokens = [this.dkimDnsToken1, this.dkimDnsToken2, this.dkimDnsToken3]
		const ttl = Duration.minutes(5)

		return [
			...tokens.map(token => ({
				name: token.name,
				type: 'CNAME' as const,
				ttl,
				records: [token.value],
			})),
			{
				name: this.fullDomain,
				type: 'TXT',
				ttl,
				records: ['"v=spf1 include:amazonses.com -all"'],
			},
			{
				name: this.fullDomain,
				type: 'MX',
				ttl,
				records: [sub('10 feedback-smtp.${AWS::Region}.amazonses.com.')],
			},
		]
	}

	properties() {
		return {
			EmailIdentity: this.props.domain,
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
							NextSigningKeyLength: constantCase(this.props.dkim),
						},
				  }
				: {}),
			FeedbackAttributes: {
				EmailForwardingEnabled: this.props.feedback ?? false,
			},
			MailFromAttributes: {
				BehaviorOnMxFailure: this.props.rejectOnMxFailure ?? true ? 'REJECT_MESSAGE' : 'USE_DEFAULT_VALUE',
				MailFromDomain: this.fullDomain,
			},
		}
	}
}
