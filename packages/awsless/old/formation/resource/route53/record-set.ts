
import { Duration } from "../../property/duration";
import { Resource } from "../../resource";

export type RecordSetProps = {
	hostedZoneId: string
	name?: string
	type: 'A' | 'AAAA' | 'CAA' | 'CNAME' | 'DS' | 'MX' | 'NAPTR' | 'NS' | 'PTR' | 'SOA' | 'SPF' | 'SRV' | 'TXT'
	ttl?: Duration
	records?: string[]
	alias?: string
}

export class RecordSet extends Resource {
	readonly name: string

	constructor(readonly logicalId: string, private props: RecordSetProps) {
		super('route53', 'record-set', logicalId)

		this.name = this.props.name || this.logicalId
	}

	template() {
		return {
			[ `${ this.logicalId }RecordSet` ]: {
				Type: 'AWS::Route53::RecordSet',
				Properties: {
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
	}
}
