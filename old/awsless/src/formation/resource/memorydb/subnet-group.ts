import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export class SubnetGroup extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			subnetIds: string[]
			name?: string
			description?: string
		}
	) {
		super('AWS::MemoryDB::SubnetGroup', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return this.getAtt('Arn')
	}

	protected properties() {
		return {
			SubnetGroupName: this.name,
			SubnetIds: this.props.subnetIds,
			...this.attr('Description', this.props.description),
		}
	}
}
