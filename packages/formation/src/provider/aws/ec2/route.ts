import { Input, unwrap } from '../../../resource/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { Peer } from './peer'

export class Route extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			gatewayId: Input<string>
			routeTableId: Input<string>
			destination: Input<Peer>
		}
	) {
		super('AWS::EC2::Route', id, props)
	}

	get gatewayId() {
		return this.output<string>(v => v.GatewayId)
	}

	get routeTableId() {
		return this.output<string>(v => v.RouteTableId)
	}

	get vpcEndpointId() {
		return this.output<string>(v => v.VpcEndpointId)
	}

	get cidrBlock() {
		return this.output(v => Peer.ipv4(v.CidrBlock))
	}

	get destinationCidrBlock() {
		return this.output(v => Peer.ipv4(v.DestinationCidrBlock))
	}

	toState() {
		return {
			document: {
				GatewayId: this.props.gatewayId,
				RouteTableId: this.props.routeTableId,
				DestinationCidrBlock: unwrap(this.props.destination).ip,
			},
		}
	}
}
