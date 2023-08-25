
import { Resource } from "../../resource";
import { formatName, getAtt } from "../../util";

export type UserProps = {
	access?: string
	name?: string
} & ({
	auth: 'iam'
} | {
	auth: 'password'
	password: string
})

export class User extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: UserProps) {
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

			...(this.props.auth === 'password' ? {
				AuthenticationMode: {
					Type: 'password',
					Passwords: [ this.props.password ]
				}
			} : {
				AuthenticationMode: {
					Type: 'IAM',
				}
			})
		}
	}
}
