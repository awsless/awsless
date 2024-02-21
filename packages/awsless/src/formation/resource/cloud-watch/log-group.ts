import { Duration } from '../../property/duration.js'
import { Resource } from '../../resource.js'
import { getAtt } from '../../util.js'

export class LogGroup extends Resource {
	constructor(
		logicalId: string,
		private props: {
			name: string
			retention?: Duration
		}
	) {
		super('AWS::Logs::LogGroup', logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	properties() {
		return {
			LogGroupName: this.props.name,
			...this.attr('RetentionInDays', this.props.retention?.toDays()),
			// KmsKeyId: String
			// DataProtectionPolicy : Json,
		}
	}
}
