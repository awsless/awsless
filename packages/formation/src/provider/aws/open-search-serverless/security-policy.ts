import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export class SecurityPolicy extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			type: Input<'encryption' | 'network'>
			policy: Input<string>
			description?: Input<string>
		}
	) {
		super('AWS::OpenSearchServerless::SecurityPolicy', id, props)
	}

	toState() {
		return {
			document: {
				Name: this.props.name,
				Type: this.props.type,
				Policy: this.props.policy,
				...this.attr('Description', this.props.description),
			},
		}
	}
}
