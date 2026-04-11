import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export class Acl extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			name?: string
			userNames: string[]
		}
	) {
		super('AWS::MemoryDB::ACL', logicalId)
		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return this.getAtt('Arn')
	}

	protected properties() {
		return {
			ACLName: this.name,
			UserNames: this.props.userNames,
		}
	}
}
