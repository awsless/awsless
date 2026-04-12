import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'

export class Route extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			apiId: Input<string>
			routeKey: Input<string>
			target: Input<string>
		}
	) {
		super(parent, 'AWS::ApiGatewayV2::Route', id, props)
	}

	get id() {
		return this.output<string>(v => v.RouteId)
	}

	toState() {
		return {
			document: {
				ApiId: this.props.apiId,
				RouteKey: this.props.routeKey,
				Target: this.props.target,
			},
		}
	}
}
