import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type InstanceType =
	| 't4g.nano'
	| 't4g.micro'
	| 't4g.small'
	| 't4g.medium'
	| 't4g.large'
	| 't4g.xlarge'
	| 't4g.2xlarge'
	| 'g4ad.xlarge'

export type LaunchTemplateProps = {
	name: Input<string>
	imageId: Input<string>
	instanceType: Input<InstanceType>
	ebsOptimized?: Input<boolean>
	iamInstanceProfile?: Input<ARN>
	monitoring?: Input<boolean>
	securityGroupIds?: Input<Input<string>[]>
	userData?: Input<string>
}

export class LaunchTemplate extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: LaunchTemplateProps
	) {
		super(parent, 'AWS::EC2::LaunchTemplate', id, props)
	}

	get name() {
		return this.output<string>(v => v.LaunchTemplateName)
	}

	get id() {
		return this.output<string>(v => v.LaunchTemplateId)
	}

	get defaultVersion() {
		return this.output<string>(v => v.DefaultVersionNumber)
	}

	get latestVersion() {
		return this.output<string>(v => v.LatestVersionNumber)
	}

	get version() {
		return this.latestVersion
	}

	toState() {
		return {
			document: {
				LaunchTemplateName: this.props.name,
				LaunchTemplateData: {
					EbsOptimized: this.props.ebsOptimized,
					IamInstanceProfile: {
						Arn: this.props.iamInstanceProfile,
					},
					ImageId: this.props.imageId,
					InstanceType: this.props.instanceType,
					Monitoring: {
						Enabled: unwrap(this.props.monitoring, false),
					},
					SecurityGroupIds: this.props.securityGroupIds,
					...this.attr('UserData', this.props.userData, v => Buffer.from(v, 'utf8').toString('base64')),
				},
			},
		}
	}
}
