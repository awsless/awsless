import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class VPCGatewayAttachment extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			vpcId: Input<string>
			internetGatewayId: Input<string>
		}
	) {
		super('AWS::EC2::VPCGatewayAttachment', id, props)
	}

	get vpcId() {
		return this.output<string>(v => v.VpcId)
	}

	get internetGatewayId() {
		return this.output<string>(v => v.InternetGatewayId)
	}

	toState() {
		return {
			document: {
				VpcId: this.props.vpcId,
				InternetGatewayId: this.props.internetGatewayId,
			},
		}
	}
}
