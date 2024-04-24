import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { Peer } from './peer'
import { SubnetRouteTableAssociation } from './subnet-route-table-association'

export class Subnet extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			vpcId: Input<string>
			cidrBlock: Input<Peer>
			availabilityZone: Input<string>
		}
	) {
		super(parent, 'AWS::EC2::Subnet', id, props)
	}

	get id() {
		return this.output<string>(v => v.SubnetId)
	}

	get vpcId() {
		return this.output<string>(v => v.VpcId)
	}

	get availabilityZone() {
		return this.output<string>(v => v.AvailabilityZone)
	}

	get availabilityZoneId() {
		return this.output<string>(v => v.AvailabilityZoneId)
	}

	associateRouteTable(routeTableId: Input<string>) {
		return new SubnetRouteTableAssociation(this, this.identifier, {
			routeTableId,
			subnetId: this.id,
		})
	}

	toState() {
		return {
			document: {
				VpcId: this.props.vpcId,
				CidrBlock: unwrap(this.props.cidrBlock).ip,
				AvailabilityZone: this.props.availabilityZone,
			},
		}
	}
}
