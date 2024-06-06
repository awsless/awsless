import { Duration, toSeconds } from '@awsless/duration'
import { constantCase, pascalCase } from 'change-case'
import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type NotificationType = 'launch' | 'launch-error' | 'terminate' | 'terminate-error'
export type TerminationPolicy =
	| 'default'
	| 'allocation-strategy'
	| 'oldest-launch-template'
	| 'oldest-launch-configuration'
	| 'closest-to-next-instance-hour'
	| 'newest-instance'
	| 'oldest-instance'

export type AutoScalingGroupProps = {
	name: Input<string>
	subnets: Input<Input<string>[]>
	launchTemplate: Input<{
		id: Input<string>
		version: Input<string>
	}>

	maxSize: Input<number>
	minSize: Input<number>

	defaultInstanceWarmup?: Input<Duration>
	desiredCapacity?: Input<number>
	maxHealthyPercentage?: Input<number>
	minHealthyPercentage?: Input<number>

	terminationPolicy?: Input<Input<TerminationPolicy>[]>

	notifications?: Input<
		Input<{
			type: Input<Input<NotificationType>[]>
			topic: Input<ARN>
		}>[]
	>
}

export class AutoScalingGroup extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: AutoScalingGroupProps
	) {
		super(parent, 'AWS::AutoScaling::AutoScalingGroup', id, props)
	}

	get name() {
		return this.output<string>(v => v.AutoScalingGroupName)
	}

	// get arn() {
	// 	return this.output<ARN>(v => v.Arn)
	// }

	toState() {
		// const log = unwrap(this.props.log)

		return {
			document: {
				AutoScalingGroupName: this.props.name,
				...this.attr('DefaultInstanceWarmup', this.props.defaultInstanceWarmup, toSeconds),

				...this.attr('DesiredCapacity', this.props.desiredCapacity),
				DesiredCapacityType: 'units',

				// "HealthCheckGracePeriod" : Integer,
				// "HealthCheckType" : String,

				// "InstanceId" : String,
				InstanceMaintenancePolicy: {
					MaxHealthyPercentage: this.props.maxHealthyPercentage,
					MinHealthyPercentage: this.props.minHealthyPercentage,
				},

				// LaunchConfigurationName: this.props.launchConfiguration,
				LaunchTemplate: {
					LaunchTemplateSpecification: {
						LaunchTemplateId: unwrap(this.props.launchTemplate).id,
						Version: unwrap(this.props.launchTemplate).version,
					},
				},

				// "LifecycleHookSpecificationList" : [ LifecycleHookSpecification, ... ],
				// "LoadBalancerNames" : [ String, ... ],

				// "MaxInstanceLifetime" : Integer,
				MaxSize: this.props.maxSize,
				MinSize: this.props.minSize,

				// "MetricsCollection" : [ MetricsCollection, ... ],
				// "MixedInstancesPolicy" : MixedInstancesPolicy,

				// "NewInstancesProtectedFromScaleIn" : Boolean,
				// "NotificationConfigurations" : [ NotificationConfiguration, ... ],

				NotificationConfigurations: unwrap(this.props.notifications, [])
					.map(v => unwrap(v))
					.map(n => ({
						NotificationTypes: unwrap(n.type).map(
							t => `autoscaling:EC2_INSTANCE_${constantCase(unwrap(t))}`
						),
						TopicARN: n.topic,
					})),

				// "PlacementGroup" : String,
				// "ServiceLinkedRoleARN" : String,
				// "Tags" : [ TagProperty, ... ],
				// "TargetGroupARNs" : [ String, ... ],
				TerminationPolicies: unwrap(this.props.terminationPolicy, [])
					.map(v => unwrap(v))
					.map(v => pascalCase(v)),

				VPCZoneIdentifier: this.props.subnets,
			},
		}
	}
}
