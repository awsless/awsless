
import { Resource } from '../../resource.js';
import { ref } from '../../util.js';

export class Integration extends Resource {

	constructor(logicalId: string, private props: {
		apiId: string
		description?: string
		type: 'AWS' | 'AWS_PROXY' | 'HTTP' | 'HTTP_PROXY' | 'MOCK'
		uri: string
		method: string
		payloadFormatVersion?: '1.0' | '2.0'
	}) {
		super('AWS::ApiGatewayV2::Integration', logicalId)
	}

	get id() {
		return ref(this.logicalId)
	}

	properties() {
		return {
			ApiId: this.props.apiId,
			IntegrationType: this.props.type,
			IntegrationUri: this.props.uri,
			IntegrationMethod: this.props.method,
			PayloadFormatVersion: this.props.payloadFormatVersion ?? '2.0',
			...this.attr('Description', this.props.description),
		}
	}
}


// Integration:
//   Type: 'AWS::ApiGatewayV2::Integration'
//   Properties:
//     ApiId: !Ref HTTPApi
//     Description: Lambda Integration
//     IntegrationType: AWS_PROXY
//     IntegrationUri: !Join
//       - ''
//       - - 'arn:'
//         - !Ref 'AWS::Partition'
//         - ':apigateway:'
//         - !Ref 'AWS::Region'
//         - ':lambda:path/2015-03-31/functions/'
//         - !GetAtt MyLambdaFunction.Arn
//         - /invocations
//     IntegrationMethod: POST
//     PayloadFormatVersion: '2.0'
