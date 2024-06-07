import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { Resource } from '../../../core/resource'
import { ARN } from '../types'

export class Instance extends Resource {
	cloudProviderId = 'aws-ec2-instance'

	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: string
			launchTemplate: Input<{
				id: Input<string>
				version: Input<string>
			}>
			keyName?: Input<string>
			subnetId?: Input<string>
			securityGroupIds?: Input<Input<string>[]>
			iamInstanceProfile?: Input<ARN>
			tags?: Input<Record<string, Input<string>>>
		}
	) {
		super(parent, 'AWS::EC2::Instance', id, props)
	}

	get id() {
		return this.output<string>(v => v.InstanceId)
	}

	get privateDnsName() {
		return this.output<string>(v => v.PrivateDnsName)
	}

	get privateIp() {
		return this.output<string>(v => v.PrivateIp)
	}

	get publicDnsName() {
		return this.output<string>(v => v.PublicDnsName)
	}

	get publicIp() {
		return this.output<string>(v => v.PublicIp)
	}

	toState() {
		const template = unwrap(this.props.launchTemplate)

		return {
			document: {
				LaunchTemplate: {
					LaunchTemplateId: template.id,
					Version: template.version,
				},
				KeyName: this.props.keyName,
				SubnetId: this.props.subnetId,
				SecurityGroupIds: this.props.securityGroupIds,
				IamInstanceProfile: this.props.iamInstanceProfile,
				Tags: [
					{
						Key: 'Name',
						Value: this.props.name,
					},
					...Object.entries(unwrap(this.props.tags, {})).map(([k, v]) => ({
						Key: k,
						Value: v,
					})),
				],
			},
		}
	}
}
