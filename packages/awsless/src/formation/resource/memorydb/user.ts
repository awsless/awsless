
import { Resource } from "../../resource";
import { formatName, getAtt } from "../../util";

export class User extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		access?: string
		name?: string
		password: string
	}) {
		super('AWS::MemoryDB::User', logicalId)

		this.name = formatName(this.props.name || this.logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	properties() {
		return {
			UserName: this.name,
			AccessString: this.props.access ?? 'on ~* &* +@all',
			AuthenticationMode: {
				Type: 'password',
				Passwords: [ this.props.password ]
			}
		}
	}
}
