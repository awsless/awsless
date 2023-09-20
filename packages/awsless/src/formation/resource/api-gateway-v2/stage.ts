import { Resource } from "../../resource";
import { formatName } from "../../util";

export class Stage extends Resource {

	readonly name: string

	constructor(logicalId: string, private props: {
		apiId: string
		deploymentId?: string
		name: string
		description?: string
		autoDeploy?: boolean
	}) {
		super('AWS::ApiGatewayV2::Stage', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	properties() {
		return {
			ApiId: this.props.apiId,
			StageName: this.name,
			AutoDeploy: this.props.autoDeploy ?? true,
			...this.attr('DeploymentId', this.props.deploymentId),
			...this.attr('Description', this.props.description),
		}
	}
}

// Type: AWS::ApiGatewayV2::Stage
// Properties:
//   AccessLogSettings:
//     AccessLogSettings
//   AccessPolicyId: String
//   ApiId: String
//   AutoDeploy: Boolean
//   ClientCertificateId: String
//   DefaultRouteSettings:
//     RouteSettings
//   DeploymentId: String
//   Description: String
//   RouteSettings: Json
//   StageName: String
//   StageVariables: Json
//   Tags: Json


// V1Stage:
//   Type: AWS::ApiGatewayV2::Stage
//   DependsOn:
//     - BooksAPI
//     - BooksAPIDeployment
//   Properties:
//     StageName: v1
//     AutoDeploy: true
//     Description: v1 Stage
//     DeploymentId: !Ref BooksAPIDeployment
//     ApiId: !Ref BooksAPI
