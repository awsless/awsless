import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'

export class InvalidateCache extends Resource {
	cloudProviderId = 'aws-cloud-front-invalidate-cache'

	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			distributionId: Input<string>
			versions: Input<Array<Input<string> | Input<string | undefined>>>
			paths: Input<Input<string>[]>
		}
	) {
		super(parent, 'AWS::CloudFront::InvalidateCache', id, props)
	}

	toState() {
		return {
			document: {
				DistributionId: this.props.distributionId,
				Versions: this.props.versions,
				Paths: this.props.paths,
			},
		}
	}
}
