import { Duration } from '../../property/duration.js'
import { Resource } from '../../resource.js'

export type RecordType =
	| 'A'
	| 'AAAA'
	| 'CAA'
	| 'CNAME'
	| 'DS'
	| 'MX'
	| 'NAPTR'
	| 'NS'
	| 'PTR'
	| 'SOA'
	| 'SPF'
	| 'SRV'
	| 'TXT'

export type Record = {
	name?: string
	type: RecordType
	ttl?: Duration
	records?: string[]
	alias?: {
		dnsName: string
		hostedZoneId: string
	}
}

export type RecordSetProps = {
	hostedZoneId: string
} & Record

export class RecordSet extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: RecordSetProps) {
		super('AWS::Route53::RecordSet', logicalId)

		this.name = this.props.name || this.logicalId
	}

	properties() {
		return {
			HostedZoneId: this.props.hostedZoneId,
			Name: typeof this.name === 'string' ? this.name + '.' : this.name,
			Type: this.props.type,
			TTL: this.props.ttl?.toSeconds(),

			...(this.props.records
				? {
						ResourceRecords: this.props.records,
				  }
				: {}),

			...(this.props.alias
				? {
						AliasTarget: {
							DNSName: this.props.alias.dnsName,
							HostedZoneId: this.props.alias.hostedZoneId,
						},
				  }
				: {}),
		}
	}
}
