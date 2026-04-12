import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export class Function extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			comment: Input<string>
			runtime?: Input<'1.0' | '2.0'>
			code: Input<string>
			// KeyValueStoreAssociations: Input<Duration>
			autoPublish?: Input<boolean>
		}
	) {
		super(parent, 'AWS::CloudFront::Function', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.FunctionARN)
	}

	toState() {
		return {
			document: {
				Name: this.props.name,
				AutoPublish: unwrap(this.props.autoPublish, true),
				FunctionCode: this.props.code,
				FunctionConfig: {
					Runtime: `cloudfront-js-${unwrap(this.props.runtime, '2.0')}`,
					Comment: this.props.comment,
				},
				// FunctionMetadata: FunctionMetadata,
			},
		}
	}
}
