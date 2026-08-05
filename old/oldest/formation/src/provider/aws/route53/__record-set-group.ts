import { Input, unwrap } from '../../../core/output'
import { AwsResource } from '../resource'
import { Record, formatRecordSet } from './record-set'

export type RecordSetGroupProps = {
	hostedZoneId: Input<string>
	records: Input<Input<Record>[]>
}

export class RecordSetGroup extends AwsResource {
	constructor(id: string, private props: RecordSetGroupProps) {
		super('AWS::Route53::RecordSetGroup', id, props)
	}

	toState() {
		return {
			document: {
				HostedZoneId: this.props.hostedZoneId,
				RecordSets: unwrap(this.props.records)
					.map(r => unwrap(r))
					.map(r => formatRecordSet(r)),
			},
		}
	}
}
