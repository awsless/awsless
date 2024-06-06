import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type ClusterProps = {
	name: Input<string>
	containerInsights?: Input<boolean>
	log?:
		| {
				provider: 'cloudwatch'
				groupName: Input<string>
		  }
		| {
				provider: 's3'
				bucketName: Input<string>
				keyPrefix?: Input<string>
		  }
}

export class Cluster extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: ClusterProps
	) {
		super(parent, 'AWS::ECS::Cluster', id, props)
	}

	get name() {
		return this.output<string>(v => v.ClusterName)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	toState() {
		const log = unwrap(this.props.log)

		return {
			document: {
				ClusterName: this.props.name,
				ClusterSettings: [
					{
						Name: 'containerInsights',
						Value: unwrap(this.props.containerInsights, false) ? 'enabled' : 'disabled',
					},
				],

				Configuration: {
					ExecuteCommandConfiguration: log
						? {
								Logging: 'DEFAULT',
								LogConfiguration:
									log.provider === 'cloudwatch'
										? {
												CloudWatchLogGroupName: log.groupName,
											}
										: {
												S3BucketName: log.bucketName,
												S3KeyPrefix: log.keyPrefix,
											},
							}
						: {
								Logging: 'NONE',
							},
				},
				// CapacityProviders: - String

				// DefaultCapacityProviderStrategy:
				// 	- CapacityProviderStrategyItem

				// ServiceConnectDefaults:
				// 	ServiceConnectDefaults
			},
		}
	}
}
