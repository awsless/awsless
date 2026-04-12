import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class RouteTable extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			vpcId: Input<string>
			name: Input<string>
		}
	) {
		super(parent, 'AWS::EC2::RouteTable', id, props)
	}

	get id() {
		return this.output<string>(v => v.RouteTableId)
	}

	// get name() {
	// 	return this.output<string>(v => v.RouteTableId)
	// }

	toState() {
		return {
			document: {
				VpcId: this.props.vpcId,
				Tags: [
					{
						Key: 'Name',
						Value: this.props.name,
					},
				],
			},
		}
	}
}
