import { Input, all, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Record, RecordSet } from './record-set.js'

export type HostedZoneProps = {
	name: Input<string>
}

export class HostedZone extends CloudControlApiResource {
	constructor(id: string, private props: HostedZoneProps) {
		super('AWS::Route53::HostedZone', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	get name() {
		return this.output<string>(v => v.Name)
	}

	get nameServers() {
		return this.output<string[]>(v => v.NameServers)
	}

	addRecord(id: string, record: Input<Record>) {
		const recordSet = new RecordSet(
			id,
			all([this.id, record]).apply(([hostedZoneId, record]) => ({
				hostedZoneId,
				...record,
			}))
		)

		this.add(recordSet)

		return recordSet
	}

	toState() {
		const name = unwrap(this.props.name)

		return {
			document: {
				Name: name.endsWith('.') ? name : name + '.',
			},
		}
	}
}
