
import { Resource } from "../../resource";
import { formatArn, getAtt, ref } from "../../util";

export class Collection extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		type: 'search' | 'timeseries' | 'vectorsearch'
		name?: string
		description?: string
	}) {
		super('AWS::OpenSearchServerless::Collection', logicalId)
		this.name = this.props.name || logicalId

		this.tag('name', this.name)
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

	get permissions() {
		return {
			actions: [ 'aoss:APIAccessAll' ],
			resources: [
				formatArn({
					service: 'aoss',
					resource: 'collection',
					resourceName: this.name,
				})
			],
		}
	}

	properties() {
		return {
			Name: this.name,
			Type: this.props.type.toUpperCase(),
			...this.attr('Description', this.props.description),
		}
	}
}
