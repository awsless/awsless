import { Input, unwrap } from '../../../resource/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { ARN } from '../types'

export type UserProps = {
	name: Input<string>
	access?: Input<string>
} & (
	| {
			auth: 'iam'
	  }
	| {
			auth: 'password'
			password: Input<string>
	  }
)

export class User extends CloudControlApiResource {
	constructor(id: string, private props: UserProps) {
		super('AWS::MemoryDB::User', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	toState() {
		return {
			document: {
				UserName: this.props.name,
				AccessString: unwrap(this.props.access, 'on ~* &* +@all'),

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
			},
		}
	}
}
