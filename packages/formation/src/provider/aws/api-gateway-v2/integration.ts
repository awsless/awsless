import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export class Integration extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			apiId: Input<string>
			description?: Input<string>
			type: Input<'AWS' | 'AWS_PROXY' | 'HTTP' | 'HTTP_PROXY' | 'MOCK'>
			uri: Input<string>
			method: Input<string>
			payloadFormatVersion?: Input<'1.0' | '2.0'>
		}
	) {
		super(parent, 'AWS::ApiGatewayV2::Integration', id, props)
	}

	get id() {
		return this.output(v => v.IntegrationId)
	}

	toState() {
		return {
			document: {
				ApiId: this.props.apiId,
				IntegrationType: this.props.type,
				IntegrationUri: this.props.uri,
				IntegrationMethod: this.props.method,
				PayloadFormatVersion: unwrap(this.props.payloadFormatVersion, '2.0'),
				...this.attr('Description', this.props.description),
			},
		}
	}
}
