import { Node } from '../../../core/node.js'
import { combine, Input, Output, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { formatTags } from '../util.js'
import { Record as DnsRecord, RecordSet } from './record-set.js'

export type HostedZoneProps = {
	name: Input<string>
	tags?: Record<string, Input<string>>
}

export class HostedZone extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: HostedZoneProps
	) {
		super(parent, 'AWS::Route53::HostedZone', id, props)
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

	addRecord(id: string, record: Input<DnsRecord>) {
		const recordProps = combine([this.id, record]).apply(([_, record]) => ({
			hostedZoneId: this.id,
			...record,
		})) as Output<DnsRecord & { hostedZoneId: Input<string> }>

		return new RecordSet(this, id, recordProps)
	}

	toState() {
		const name = unwrap(this.props.name)

		return {
			document: {
				Name: name.endsWith('.') ? name : name + '.',
				HostedZoneTags: formatTags(this.tags),
			},
		}
	}
}
