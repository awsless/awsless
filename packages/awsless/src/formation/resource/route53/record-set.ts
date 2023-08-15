
import { Duration } from "../../property/duration";
import { Resource } from "../../resource";

export type RecordType = 'A' | 'AAAA' | 'CAA' | 'CNAME' | 'DS' | 'MX' | 'NAPTR' | 'NS' | 'PTR' | 'SOA' | 'SPF' | 'SRV' | 'TXT'

export type RecordSetProps = {
	hostedZoneId: string
	name?: string
	type: RecordType
	ttl?: Duration
	records?: string[]
	alias?: string
}

export class RecordSet extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: RecordSetProps) {
		super('AWS::Route53::RecordSet', logicalId)

		this.name = this.props.name || this.logicalId
	}

	properties() {
		return {
			HostedZoneId: this.props.hostedZoneId,
			Name: this.name + '.',
			Type: this.props.type,
			TTL: this.props.ttl,

			...(this.props.records ? {
				ResourceRecords: this.props.records
			} : {}),

			...(this.props.alias ? {
				AliasTarget: {
					DNSName: this.props.alias,
					HostedZoneId: this.props.hostedZoneId,
				}
			} : {}),
		}
	}
}
