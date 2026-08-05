import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class SubnetRouteTableAssociation extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			subnetId: Input<string>
			routeTableId: Input<string>
		}
	) {
		super(parent, 'AWS::EC2::SubnetRouteTableAssociation', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	toState() {
		return {
			document: {
				SubnetId: this.props.subnetId,
				RouteTableId: this.props.routeTableId,
			},
		}
	}
}
