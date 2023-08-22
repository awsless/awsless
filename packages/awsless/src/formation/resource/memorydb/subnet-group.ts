
import { Resource } from "../../resource";
import { formatName, getAtt } from "../../util";

export class SubnetGroup extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		subnetIds: string[]
		name?: string
		description?: string
	}) {
		super('AWS::MemoryDB::SubnetGroup', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	properties() {
		return {
			SubnetGroupName: this.name,
			SubnetIds: this.props.subnetIds,
			...this.attr('Description', this.props.description),
		}
	}
}
