import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export class InstanceProfile extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name?: Input<string>
			path?: Input<string>
			roles: Input<Input<string>[]>
		}
	) {
		super(parent, 'AWS::IAM::InstanceProfile', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get name() {
		return this.output<string>(v => v.RoleName)
	}

	toState() {
		return {
			document: {
				...this.attr('InstanceProfileName', this.props.name),
				...this.attr('Path', this.props.path),
				Roles: this.props.roles,
			},
		}
	}
}
