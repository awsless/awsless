import { Asset } from '../../../core/asset.js'
import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'

export type ImageProps = {
	repository: Input<string>
	hash: Input<Asset>
	name: Input<string>
	tag: Input<string>
}

export class Image extends Resource {
	cloudProviderId = 'aws-ecr-image'

	constructor(
		readonly parent: Node,
		id: string,
		private props: ImageProps
	) {
		super(parent, 'AWS::ECR::Image', id, props)
	}

	get uri() {
		return this.output<string>(v => v.ImageUri)
	}

	toState() {
		return {
			assets: {
				hash: this.props.hash,
			},
			document: {
				RepositoryName: this.props.repository,
				ImageName: this.props.name,
				Tag: this.props.tag,
			},
		}
	}
}
