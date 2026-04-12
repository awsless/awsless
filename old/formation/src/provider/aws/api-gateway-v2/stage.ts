import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { Resource } from '../../../core/resource'

export class Stage extends Resource {
	cloudProviderId = 'aws-api-gateway-v2-stage'

	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			apiId: Input<string>
			deploymentId?: Input<string>
			name: Input<string>
			description?: Input<string>
			autoDeploy?: Input<boolean>
		}
	) {
		super(parent, 'AWS::ApiGatewayV2::Stage', id, props)
	}

	get id() {
		return this.output<string>(v => v.StageId)
	}

	get name() {
		return this.output<string>(v => v.StageName)
	}

	toState() {
		return {
			document: {
				ApiId: this.props.apiId,
				StageName: this.props.name,
				AutoDeploy: unwrap(this.props.autoDeploy, true),
				...this.attr('DeploymentId', this.props.deploymentId),
				...this.attr('Description', this.props.description),
			},
		}
	}
}
