import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class InternetGateway extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name?: Input<string>
		} = {}
	) {
		super(parent, 'AWS::EC2::InternetGateway', id, props)
	}

	get id() {
		return this.output<string>(v => v.InternetGatewayId)
	}

	toState() {
		return {
			document: {
				Tags: this.props.name
					? [
							{
								Key: 'Name',
								Value: this.props.name,
							},
					  ]
					: [],
			},
		}
	}
}
