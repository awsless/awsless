import { Input, unwrap } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'

export class InvalidateCache extends Resource {
	cloudProviderId = 'aws-cloud-front-invalidate-cache'

	constructor(
		id: string,
		private props: {
			distributionId: Input<string>
			versions: Input<Array<Input<string> | Input<string | undefined>>>
			paths: Input<Input<string>[]>
		}
	) {
		super('AWS::CloudFront::InvalidateCache', id, props)
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
