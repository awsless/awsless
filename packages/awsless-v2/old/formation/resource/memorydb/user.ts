import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export type UserProps = {
	access?: string
	name?: string
} & (
	| {
			auth: 'iam'
	  }
	| {
			auth: 'password'
			password: string
	  }
)

export class User extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: UserProps) {
		super('AWS::MemoryDB::User', logicalId)

		this.name = formatName(this.props.name || this.logicalId)
	}

	get arn() {
		return this.getAtt('Arn')
	}

	protected properties() {
		return {
			UserName: this.name,
			AccessString: this.props.access ?? 'on ~* &* +@all',

			...(this.props.auth === 'password'
				? {
						AuthenticationMode: {
							Type: 'password',
							Passwords: [this.props.password],
						},
				  }
				: {
						AuthenticationMode: {
							Type: 'IAM',
						},
				  }),
		}
	}
}
