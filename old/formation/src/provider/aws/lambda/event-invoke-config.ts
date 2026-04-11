import { Duration, toSeconds } from '@awsless/duration'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Input, unwrap } from '../../../core/output.js'
import { ARN } from '../types.js'
import { Node } from '../../../core/node.js'

export type EventInvokeConfigProps = {
	functionArn: Input<ARN>
	maxEventAge?: Input<Duration>
	onFailure?: Input<ARN>
	onSuccess?: Input<ARN>
	qualifier?: Input<string>
	retryAttempts?: Input<number>
}

export class EventInvokeConfig extends CloudControlApiResource {
	constructor(readonly parent: Node, id: string, private props: EventInvokeConfigProps) {
		super(parent, 'AWS::Lambda::EventInvokeConfig', id, props)
	}

	setOnFailure(arn: Input<ARN>) {
		this.props.onFailure = arn

		return this
	}

	setOnSuccess(arn: Input<ARN>) {
		this.props.onSuccess = arn

		return this
	}

	toState() {
		return {
			document: {
				FunctionName: this.props.functionArn,
				Qualifier: unwrap(this.props.qualifier, '$LATEST'),

				...this.attr('MaximumEventAgeInSeconds', this.props.maxEventAge, toSeconds),
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
			},
		}
	}
}
