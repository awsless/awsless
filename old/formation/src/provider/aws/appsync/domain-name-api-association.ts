import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class DomainNameApiAssociation extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			apiId: Input<string>
			domainName: Input<string>
		}
	) {
		super(parent, 'AWS::AppSync::DomainNameApiAssociation', id, props)
	}

	toState() {
		return {
			document: {
				ApiId: this.props.apiId,
				DomainName: this.props.domainName,
			},
		}
	}
}
