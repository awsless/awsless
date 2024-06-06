import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type LaunchConfigurationProps = {
	name: Input<string>
	imageId: Input<string>
	instanceType: Input<string>
	ebsOptimized?: Input<boolean>
	iamInstanceProfile?: Input<ARN>
	instanceMonitoring?: Input<boolean>
	securityGroups?: Input<Input<string>[]>
	userData?: Input<string>
}

export class LaunchConfiguration extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: LaunchConfigurationProps
	) {
		super(parent, 'AWS::AutoScaling::LaunchConfiguration', id, props)
	}

	get name() {
		return this.output<string>(v => v.LaunchConfigurationName)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	toState() {
		return {
			document: {
				LaunchConfigurationName: this.props.name,
				EbsOptimized: this.props.ebsOptimized,
				IamInstanceProfile: this.props.iamInstanceProfile,
				ImageId: this.props.imageId,
				InstanceType: this.props.instanceType,
				InstanceMonitoring: unwrap(this.props.instanceMonitoring, false),
				SecurityGroups: this.props.securityGroups,
				...this.attr('UserData', this.props.userData, v => Buffer.from(v, 'utf8').toString('base64')),

				// AssociatePublicIpAddress: Boolean
				// BlockDeviceMappings:
				//   - BlockDeviceMapping
				// ClassicLinkVPCId: String
				// ClassicLinkVPCSecurityGroups:
				//   - String
				// EbsOptimized: Boolean
				// IamInstanceProfile: String
				// ImageId: String
				// InstanceId: String
				// InstanceMonitoring: Boolean
				// InstanceType: String
				// KernelId: String
				// KeyName: String
				// LaunchConfigurationName: String
				// MetadataOptions:
				//   MetadataOptions
				// PlacementTenancy: String
				// RamDiskId: String
				// SecurityGroups:
				//   - String
				// SpotPrice: String
				// UserData: String
			},
		}
	}
}
