import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export class SubscriptionFilter extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name?: Input<string>
			logGroupName: Input<string>
			destinationArn: Input<ARN>
			distribution: Input<'Random' | 'ByLogStream'>
		}
	) {
		super(parent, 'AWS::Logs::SubscriptionFilter', id, props)
	}

	get name() {
		return this.output<string>(v => v.LogGroupName)
	}

	toState() {
		return {
			document: {
				FilterName: this.props.name,
				LogGroupName: this.props.logGroupName,
				DestinationArn: this.props.destinationArn,
				Distribution: unwrap(this.props.distribution, 'ByLogStream'),
			},
		}
	}
}
