import { Input } from '../../../resource/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export class SubnetGroup extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			subnetIds: Input<Input<string>[]>
			name: Input<string>
			description?: Input<string>
		}
	) {
		super('AWS::MemoryDB::SubnetGroup', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.ARN)
	}

	get name() {
		return this.output<string>(v => v.SubnetGroupName)
	}

	toState() {
		return {
			document: {
				SubnetGroupName: this.props.name,
				SubnetIds: this.props.subnetIds,
				...this.attr('Description', this.props.description),
			},
		}
	}
}
