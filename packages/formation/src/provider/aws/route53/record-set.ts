import { Duration, minutes, toSeconds } from '@awsless/duration'
import { Input, unwrap } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'
import { Node } from '../../../core/node.js'

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
	type: Input<RecordType>
	name: Input<string>
	weight?: Input<number>
} & (
	| {
			ttl?: Input<Duration>
			records?: Input<Input<string>[]>
	  }
	| {
			alias?: Input<{
				dnsName: Input<string>
				hostedZoneId: Input<string>
				evaluateTargetHealth: Input<boolean>
			}>
	  }
)

// export type Record = {
// 	type: Input<RecordType>
// 	name: Input<string>
// 	weight?: Input<number>
// 	ttl?: Input<Duration>
// 	target: Input<RecordTarget>
// }

export type RecordSetProps = {
	hostedZoneId: Input<string>
} & Record

export const formatRecordSet = (record: Record) => {
	const name = unwrap(record.name)

	return {
		Name: name.endsWith('.') ? name : name + '.',
		Type: record.type,
		Weight: unwrap(record.weight, 0),
		// ...(record.ttl ? {} : {}),
		...('records' in record
			? {
					TTL: toSeconds(unwrap(record.ttl, minutes(5))),
					ResourceRecords: record.records,
			  }
			: {}),
		...('alias' in record && unwrap(record.alias)
			? {
					AliasTarget: {
						DNSName: unwrap(record.alias)!.dnsName,
						HostedZoneId: unwrap(record.alias)!.hostedZoneId,
						EvaluateTargetHealth: unwrap(record.alias)!.evaluateTargetHealth,
					},
			  }
			: {}),
		// ...unwrap(record.target).toJSON(),
	}
}

export class RecordSet extends Resource {
	cloudProviderId = 'aws-route53-record-set'

	constructor(readonly parent: Node, id: string, private props: Input<RecordSetProps>) {
		super(parent, 'AWS::Route53::RecordSet', id, props)
	}

	toState() {
		return {
			document: {
				HostedZoneId: unwrap(this.props).hostedZoneId,
				...formatRecordSet(unwrap(this.props)),
			},
		}
	}
}

// export abstract class RecordTarget {
// 	static fromRecords(records: RecordsRecordTargetProps) {
// 		return new RecordsRecordTarget(records)
// 	}

// 	static fromAlias(props: AliasRecordTargetProps) {
// 		return new AliasRecordTarget(props)
// 	}

// 	abstract toJSON(): object
// }

// type RecordsRecordTargetProps = Input<string>[]

// export class RecordsRecordTarget extends RecordTarget {
// 	constructor(private records: RecordsRecordTargetProps) {
// 		super()
// 	}

// 	toJSON() {
// 		return {
// 			ResourceRecords: this.records,
// 		}
// 	}
// }

// type AliasRecordTargetProps = {
// 	dnsName: Input<string>
// 	hostedZoneId: Input<string>
// }

// export class AliasRecordTarget extends RecordTarget {
// 	constructor(private props: AliasRecordTargetProps) {
// 		super()
// 	}

// 	toJSON() {
// 		return {
// 			AliasTarget: {
// 				DNSName: this.props.dnsName,
// 				HostedZoneId: this.props.hostedZoneId,
// 			},
// 		}
// 	}
// }
