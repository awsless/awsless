import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export class OriginAccessControl extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			type: Input<'mediastore' | 's3'>
			behavior?: Input<'always' | 'never' | 'no-override'>
			protocol?: Input<'sigv4'>
		}
	) {
		super(parent, 'AWS::CloudFront::OriginAccessControl', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	toState() {
		return {
			document: {
				OriginAccessControlConfig: {
					Name: this.props.name,
					OriginAccessControlOriginType: this.props.type,
					SigningBehavior: unwrap(this.props.behavior, 'always'),
					SigningProtocol: unwrap(this.props.protocol, 'sigv4'),
				},
			},
		}
	}
}
