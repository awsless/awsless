import { Resource } from '../../resource.js'
import { Record } from './record-set.js'

export type RecordSetGroupProps = {
	hostedZoneId: string
	records: Record[]
}

export class RecordSetGroup extends Resource {
	constructor(logicalId: string, private props: RecordSetGroupProps) {
		super('AWS::Route53::RecordSetGroup', logicalId)
	}

	properties() {
		return {
			HostedZoneId: this.props.hostedZoneId,
			RecordSets: this.props.records.map(props => ({
				Name: typeof props.name === 'string' ? props.name + '.' : props.name,
				Type: props.type,
				TTL: props.ttl?.toSeconds(),

				...(props.records
					? {
							ResourceRecords: props.records,
					  }
					: {}),

				...(props.alias
					? {
							AliasTarget: {
								DNSName: props.alias,
								HostedZoneId: this.props.hostedZoneId,
							},
					  }
					: {}),
			})),
		}
	}
}
