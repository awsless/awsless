
import { Duration } from "../../property/duration";
import { Resource } from "../../resource";
import { RecordType } from "./record-set";

export type RecordSetGroupProps = {
	hostedZoneId: string
	records: {
		name?: string
		type: RecordType
		ttl?: Duration
		records?: string[]
		alias?: string
	}[]
}

export class RecordSetGroup extends Resource {

	constructor(logicalId: string, private props: RecordSetGroupProps) {
		super('AWS::Route53::RecordSetGroup', logicalId)
	}

	properties() {
		return {
			HostedZoneId: this.props.hostedZoneId,
			RecordSets: this.props.records.map(props => ({
				Name: props.name + '.',
				Type: props.type,
				TTL: props.ttl,

				...(props.records ? {
					ResourceRecords: props.records
				} : {}),

				...(props.alias ? {
					AliasTarget: {
						DNSName: props.alias,
						HostedZoneId: this.props.hostedZoneId,
					}
				} : {}),
			}))
		}
	}
}
