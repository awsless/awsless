import { Duration } from '../../property/duration.js'
import { Resource } from '../../resource.js'

export type EventInvokeConfigProps = {
	functionName: string
	maxEventAge?: Duration
	onFailure?: string
	onSuccess?: string
	qualifier?: string
	retryAttempts?: number
}

export class EventInvokeConfig extends Resource {
	constructor(logicalId: string, private props: EventInvokeConfigProps) {
		super('AWS::Lambda::EventInvokeConfig', logicalId)
	}

	setOnFailure(arn: string) {
		this.props.onFailure = arn

		return this
	}

	setOnSuccess(arn: string) {
		this.props.onSuccess = arn

		return this
	}

	protected properties() {
		return {
			FunctionName: this.props.functionName,
			Qualifier: this.props.qualifier || '$LATEST',

			...this.attr('MaximumEventAgeInSeconds', this.props.maxEventAge?.toSeconds()),
			...this.attr('MaximumRetryAttempts', this.props.retryAttempts),

			...(this.props.onFailure || this.props.onSuccess
				? {
						DestinationConfig: {
							...(this.props.onFailure
								? {
										OnFailure: {
											Destination: this.props.onFailure,
										},
								  }
								: {}),
							...(this.props.onSuccess
								? {
										OnSuccess: {
											Destination: this.props.onSuccess,
										},
								  }
								: {}),
						},
				  }
				: {}),
		}
	}
}
