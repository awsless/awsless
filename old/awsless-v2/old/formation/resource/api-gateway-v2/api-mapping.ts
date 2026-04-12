import { Resource } from '../../resource.js'

export class ApiMapping extends Resource {
	constructor(
		logicalId: string,
		private props: {
			domainName: string
			apiId: string
			stage: string
		}
	) {
		super('AWS::ApiGatewayV2::ApiMapping', logicalId)
	}

	get id() {
		return this.getAtt('ApiMappingId')
	}

	protected properties() {
		return {
			DomainName: this.props.domainName,
			ApiId: this.props.apiId,
			Stage: this.props.stage,
		}
	}
}
