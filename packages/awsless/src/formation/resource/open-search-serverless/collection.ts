
import { Resource } from "../../resource";
import { getAtt, ref } from "../../util";

export class Collection extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		type: 'search' | 'timeseries' | 'vectorsearch'
		name?: string
		description?: string
	}) {
		super('AWS::OpenSearchServerless::Collection', logicalId)
		this.name = this.props.name || logicalId
	}

	get id() {
		return ref(this.logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	get endpoint() {
		return getAtt(this.logicalId, 'CollectionEndpoint')
	}

	properties() {
		return {
			Name: this.name,
			Type: this.props.type.toUpperCase(),
			...this.attr('Description', this.props.description),
		}
	}
}
