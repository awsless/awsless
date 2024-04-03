import { ARN } from '../types.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export type RuleProps = {
	name: Input<string>
	description?: Input<string>
	enabled?: Input<boolean>
	roleArn?: Input<ARN>
	eventBusName?: Input<string>
	eventPattern?: Input<string>
	schedule: Input<string>
	targets: Input<Input<RuleTarget>[]>
}

export type RuleTarget = {
	arn: Input<ARN>
	id: Input<string>
	input?: Input<unknown>
}

export class Rule extends CloudControlApiResource {
	constructor(id: string, private props: RuleProps) {
		super('AWS::Events::Rule', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	toState() {
		return {
			document: {
				Name: this.props.name,
				...this.attr('State', this.props.enabled ? 'ENABLED' : 'DISABLED'),
				...this.attr('Description', this.props.description),
				...this.attr('ScheduleExpression', this.props.schedule),
				...this.attr('RoleArn', this.props.roleArn),
				...this.attr('EventBusName', this.props.eventBusName),
				...this.attr('EventPattern', this.props.eventPattern),
				Targets: unwrap(this.props.targets)
					.map(v => unwrap(v))
					.map(target => ({
						Arn: target.arn,
						Id: target.id,
						...this.attr('Input', unwrap(target.input) && JSON.stringify(unwrap(target.input))),
					})),
			},
		}
	}
}
