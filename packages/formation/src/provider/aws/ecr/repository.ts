import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type RepositoryProps = {
	name: Input<string>
	emptyOnDelete?: Input<boolean>
	imageTagMutability?: Input<boolean>
}

export class Repository extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: RepositoryProps
	) {
		super(parent, 'AWS::ECR::Repository', id, props)
	}

	get name() {
		return this.output<string>(v => v.RepositoryName)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get uri() {
		return this.output<string>(v => v.RepositoryUri)
	}

	toState() {
		return {
			document: {
				RepositoryName: this.props.name,
				EmptyOnDelete: this.props.emptyOnDelete,
				ImageTagMutability: this.props.imageTagMutability ? 'MUTABLE' : 'IMMUTABLE',
			},
		}
	}
}
