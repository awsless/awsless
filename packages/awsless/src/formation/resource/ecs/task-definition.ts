import { Resource } from '../../resource.js'
import { formatName, getAtt } from '../../util.js'

export class TaskDefinition extends Resource {
	constructor(
		logicalId: string,
		private props: {
			name?: string
			// cpu:
			// insights?: boolean
			// logging?: boolean
			// capacityProviders?: Array<'FARGATE' | 'FARGATE_SPOT'>
			// capacityProviderStrategy?: {
			// 	capacityProvider: 'FARGATE' | 'FARGATE_SPOT'
			// 	weight: number
			// 	base: number
			// }[]
		} = {}
	) {
		super('AWS::ECS::TaskDefinition', logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	protected properties() {
		return {
			ContainerDefinitions: this.name,
			Cpu: this.props.cpu,
			// ...(this.props.logging ? {
			// 	Configuration: {
			// 		ExecuteCommandConfiguration: {
			// 			Logging: 'DEFAULT'
			// 		}
			// 	},
			// } : {}),
			// ...(this.props.insights ? {
			// 	ClusterSettings: [ {
			// 		Name: 'containerInsights',
			// 		Value: 'enabled',
			// 	} ],
			// } : {}),
			// ...this.attr('CapacityProviders', this.props.capacityProviders),
			// ...this.attr('DefaultCapacityProviderStrategy', this.props.capacityProviderStrategy?.map(strategy => ({
			// 	...this.attr('CapacityProvider', strategy.capacityProvider),
			// 	...this.attr('Weight', strategy.weight),
			// 	...this.attr('Base', strategy.base),
			// }))),
		}
	}
}

// {
// 	"Type" : "AWS::ECS::TaskDefinition",
// 	"Properties" : {
// 		"ContainerDefinitions" : [ ContainerDefinition, ... ],
// 		"Cpu" : String,
// 		"EphemeralStorage" : EphemeralStorage,
// 		"ExecutionRoleArn" : String,
// 		"Family" : String,
// 		"InferenceAccelerators" : [ InferenceAccelerator, ... ],
// 		"IpcMode" : String,
// 		"Memory" : String,
// 		"NetworkMode" : String,
// 		"PidMode" : String,
// 		"PlacementConstraints" : [ TaskDefinitionPlacementConstraint, ... ],
// 		"ProxyConfiguration" : ProxyConfiguration,
// 		"RequiresCompatibilities" : [ String, ... ],
// 		"RuntimePlatform" : RuntimePlatform,
// 		"Tags" : [ Tag, ... ],
// 		"TaskRoleArn" : String,
// 		"Volumes" : [ Volume, ... ]
// 	  }
//   }
