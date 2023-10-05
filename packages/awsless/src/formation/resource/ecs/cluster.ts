import { Resource } from '../../resource.js';
import { formatName, getAtt } from '../../util.js';

export class Cluster extends Resource {

	readonly name: string

	constructor(logicalId: string, private props: {
		name?: string
		insights?: boolean
		logging?: boolean
		capacityProviders?: Array<'FARGATE' | 'FARGATE_SPOT'>
		capacityProviderStrategy?: {
			capacityProvider: 'FARGATE' | 'FARGATE_SPOT'
			weight: number
			base: number
		}[]
	} = {}) {
		super('AWS::ECS::Cluster', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	properties() {
		return {
			ClusterName: this.name,
			...(this.props.logging ? {
				Configuration: {
					ExecuteCommandConfiguration: {
						Logging: 'DEFAULT'
					}
				},
			} : {}),
			...(this.props.insights ? {
				ClusterSettings: [ {
					Name: 'containerInsights',
					Value: 'enabled',
				} ],
			} : {}),
			...this.attr('CapacityProviders', this.props.capacityProviders),
			...this.attr('DefaultCapacityProviderStrategy', this.props.capacityProviderStrategy?.map(strategy => ({
				...this.attr('CapacityProvider', strategy.capacityProvider),
				...this.attr('Weight', strategy.weight),
				...this.attr('Base', strategy.base),
			}))),
		}
	}
}
