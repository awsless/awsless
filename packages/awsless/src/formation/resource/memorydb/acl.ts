
import { Resource } from "../../resource";
import { formatName, getAtt } from "../../util";

export class Acl extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		name?: string
		userNames: string[]
	}) {
		super('AWS::MemoryDB::ACL', logicalId)
		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	properties() {
		return {
			ACLName: this.name,
			UserNames: this.props.userNames,
		}
	}
}
