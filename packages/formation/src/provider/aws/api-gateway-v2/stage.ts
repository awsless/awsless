import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'

export class Stage extends CloudControlApiResource {
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
