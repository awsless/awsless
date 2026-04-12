import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export class ApiMapping extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			domainName: Input<string>
			apiId: Input<string>
			stage: Input<string>
		}
	) {
		super(parent, 'AWS::ApiGatewayV2::ApiMapping', id, props)
	}

	get id() {
		return this.output<string>(v => v.ApiMappingId)
	}

	toState() {
		return {
			document: {
				DomainName: this.props.domainName,
				ApiId: this.props.apiId,
				Stage: this.props.stage,
			},
		}
	}
}
