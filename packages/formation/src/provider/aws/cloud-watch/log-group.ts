import { Duration, toDays } from '@awsless/duration'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Input, unwrap } from '../../../resource/output.js'
import { ARN } from '../types.js'

export class LogGroup extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			retention?: Input<Duration>
		}
	) {
		super('AWS::Logs::LogGroup', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get name() {
		return this.output<string>(v => v.LogGroupName)
	}

	get permissions() {
		return [
			{
				actions: ['logs:CreateLogStream'],
				resources: [this.arn],
			},
			{
				actions: ['logs:PutLogEvents'],
				resources: [this.arn.apply<ARN>(arn => `${arn}:*`)],
			},
		]
	}

	toState() {
		return {
			document: {
				LogGroupName: this.props.name,
				...this.attr('RetentionInDays', this.props.retention && toDays(unwrap(this.props.retention))),
				// KmsKeyId: String
				// DataProtectionPolicy : Json,
			},
		}
	}
}
