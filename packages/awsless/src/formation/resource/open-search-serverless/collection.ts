import { Resource } from '../../resource.js'
import { formatArn } from '../../util.js'

export class Collection extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			type: 'search' | 'timeseries' | 'vectorsearch'
			name?: string
			description?: string
		}
	) {
		super('AWS::OpenSearchServerless::Collection', logicalId)
		this.name = this.props.name || logicalId

		this.tag('name', this.name)
	}

	get id() {
		return this.ref()
	}

	get arn() {
		return this.getAtt('Arn')
	}

	get endpoint() {
		return this.getAtt('CollectionEndpoint')
	}

	get permissions() {
		return {
			actions: ['aoss:APIAccessAll'],
			resources: [
				formatArn({
					service: 'aoss',
					resource: 'collection',
					resourceName: this.name,
				}),
			],
		}
	}

	protected properties() {
		return {
			Name: this.name,
			Type: this.props.type.toUpperCase(),
			...this.attr('Description', this.props.description),
		}
	}
}
