
import { Resource } from '../../resource.js';
import { getAtt } from '../../util.js';

export class Route extends Resource {

	constructor(logicalId: string, private props: {
		apiId: string
		routeKey: string
		target: string
	}) {
		super('AWS::ApiGatewayV2::Route', logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'RouteId')
	}

	properties() {
		return {
			ApiId: this.props.apiId,
			RouteKey: this.props.routeKey,
			Target: this.props.target,
		}
	}
}
