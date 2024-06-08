import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { Peer } from './peer'
import { SubnetRouteTableAssociation } from './subnet-route-table-association'

export class Subnet extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name?: Input<string>
			vpcId: Input<string>
			availabilityZone: Input<string>

			cidrBlock?: Input<Peer>
			ipv6CidrBlock?: Input<Peer>
			ipv6Native?: Input<boolean>
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
				AvailabilityZone: this.props.availabilityZone,
				// CidrBlock: unwrap(this.props.cidrBlock).ip,
				...this.attr('CidrBlock', this.props.cidrBlock, v => v.ip),
				...this.attr('Ipv6CidrBlock', this.props.ipv6CidrBlock, v => v.ip),
				...this.attr('Ipv6Native', this.props.ipv6Native),
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
