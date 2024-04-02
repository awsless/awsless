import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export class ConfigurationSet extends Resource {
	readonly name: string
	constructor(
		logicalId: string,
		private props: {
			name?: string
			engagementMetrics?: boolean
			reputationMetrics?: boolean
			sending?: boolean
		}
	) {
		super('AWS::SES::ConfigurationSet', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	protected properties() {
		return {
			Name: this.name,
			VdmOptions: {
				DashboardOptions: {
					EngagementMetrics: this.props.engagementMetrics ?? false ? 'ENABLED' : 'DISABLED',
				},
			},
			ReputationOptions: {
				ReputationMetricsEnabled: this.props.reputationMetrics ?? false,
			},
			SendingOptions: {
				SendingEnabled: this.props.sending ?? true,
			},
		}
	}
}
