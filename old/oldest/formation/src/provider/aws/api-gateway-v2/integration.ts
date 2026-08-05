import { IntegrationType } from '@aws-sdk/client-apigatewayv2'
import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'

export class Integration extends Resource {
	cloudProviderId = 'aws-api-gateway-v2-integration'

	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			apiId: Input<string>
			description?: Input<string>
			type: Input<IntegrationType>
			uri: Input<string>
			method: Input<string>
			payloadFormatVersion?: Input<'1.0' | '2.0'>
		}
	) {
		super(parent, 'AWS::ApiGatewayV2::Integration', id, props)
	}

	get id() {
		return this.output<string>(v => v.IntegrationId)
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
