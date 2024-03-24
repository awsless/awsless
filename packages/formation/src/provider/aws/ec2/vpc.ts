import { Input, unwrap } from '../../../resource/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Peer } from './peer.js'

// export type VpcProps = {
// 	availabilityZones: string[]
// 	subnetConfiguration: {
// 		subnetType: 'public' | 'private'
// 		cidrMask: 18 | 19 | 20 | 21 | 22 | 23 | 24,
// 	}[]
// }

export class Vpc extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			cidrBlock: Input<Peer>
		}
	) {
		super('AWS::EC2::VPC', id, props)
	}

	get id() {
		return this.output<string>(v => v.VpcId)
	}

	get defaultNetworkAcl() {
		return this.output<string>(v => v.DefaultNetworkAcl)
	}

	get defaultSecurityGroup() {
		return this.output<string>(v => v.DefaultSecurityGroup)
	}

	toState() {
		return {
			document: {
				CidrBlock: unwrap(this.props.cidrBlock).ip,
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

// export class SubnetRouteTableAssociation extends Resource {
// 	constructor(
// 		logicalId: string,
// 		private props: {
// 			subnetId: string
// 			routeTableId: string
// 		}
// 	) {
// 		super('AWS::EC2::SubnetRouteTableAssociation', logicalId)
// 	}

// 	get id() {
// 		return this.ref()
// 	}

// 	protected properties() {
// 		return {
// 			SubnetId: this.props.subnetId,
// 			RouteTableId: this.props.routeTableId,
// 		}
// 	}
// }
