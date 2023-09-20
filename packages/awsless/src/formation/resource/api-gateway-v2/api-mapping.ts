
import { Resource } from "../../resource";
import { getAtt } from "../../util";

export class ApiMapping extends Resource {

	constructor(logicalId: string, private props: {
		domainName: string
		apiId: string
		stage: string
	}) {
		super('AWS::ApiGatewayV2::ApiMapping', logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'ApiMappingId')
	}

	properties() {
		return {
			DomainName: this.props.domainName,
			ApiId: this.props.apiId,
			Stage: this.props.stage
		}
	}
}
