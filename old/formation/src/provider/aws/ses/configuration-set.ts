import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class ConfigurationSet extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			engagementMetrics?: Input<boolean>
			reputationMetrics?: Input<boolean>
			sending?: Input<boolean>
		}
	) {
		super(parent, 'AWS::SES::ConfigurationSet', id, props)
	}

	get name() {
		return this.output<string>(v => v.Name)
	}

	toState() {
		return {
			document: {
				Name: this.props.name,
				VdmOptions: {
					DashboardOptions: {
						EngagementMetrics: unwrap(this.props.engagementMetrics, false) ? 'ENABLED' : 'DISABLED',
					},
				},
				ReputationOptions: {
					ReputationMetricsEnabled: unwrap(this.props.reputationMetrics, false),
				},
				SendingOptions: {
					SendingEnabled: unwrap(this.props.sending, true),
				},
			},
		}
	}
}
