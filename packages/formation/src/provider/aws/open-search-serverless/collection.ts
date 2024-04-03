import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export class Collection extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			type: Input<'search' | 'timeseries' | 'vectorsearch'>
			description?: Input<string>
		}
	) {
		super('AWS::OpenSearchServerless::Collection', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get endpoint() {
		return this.output<string>(v => v.CollectionEndpoint)
	}

	get permissions() {
		return {
			actions: ['aoss:APIAccessAll'],
			resources: [this.arn],
		}
	}

	toState() {
		return {
			document: {
				Name: this.props.name,
				Type: unwrap(this.props.type).toUpperCase(),
				...this.attr('Description', this.props.description),
			},
		}
	}
}
