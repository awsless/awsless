import { Input } from '../../../resource/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export class Acl extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			userNames: Input<Input<string>[]>
		}
	) {
		super('AWS::MemoryDB::ACL', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	toState() {
		return {
			document: {
				ACLName: this.props.name,
				UserNames: this.props.userNames,
			},
		}
	}
}
