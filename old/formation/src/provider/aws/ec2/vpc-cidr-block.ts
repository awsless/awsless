import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { Peer } from './peer'

export class VPCCidrBlock extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			vpcId: Input<string>
			cidrBlock?: Input<Peer>
			amazonProvidedIpv6CidrBlock?: Input<boolean>
		}
	) {
		super(parent, 'AWS::EC2::VPCCidrBlock', id, props)
	}

	get vpcId() {
		return this.output<string>(v => v.VpcId)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	get ipv6CidrBlock() {
		return this.output<string>(v => v.Ipv6CidrBlock)
	}

	toState() {
		return {
			document: {
				VpcId: this.props.vpcId,
				...this.attr('CidrBlock', this.props.cidrBlock, v => v.ip),
				AmazonProvidedIpv6CidrBlock: this.props.amazonProvidedIpv6CidrBlock,
			},
		}
	}
}
