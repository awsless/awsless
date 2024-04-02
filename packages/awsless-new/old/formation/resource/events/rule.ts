import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export type RuleProps = {
	name?: string
	enabled?: boolean
	description?: string
	roleArn?: string
	eventBusName?: string
	eventPattern?: string
	schedule?: string
	targets: RuleTarget[]
}

export interface RuleTarget {
	arn: string
	id: string
	input?: unknown
}

export class Rule extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: RuleProps) {
		super('AWS::Events::Rule', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get id() {
		return this.ref()
	}

	get arn() {
		return this.getAtt('Arn')
	}

	protected properties() {
		return {
			Name: this.name,
			...this.attr('State', this.props.enabled ? 'ENABLED' : 'DISABLED'),
			...this.attr('Description', this.props.description),
			...this.attr('ScheduleExpression', this.props.schedule),
			...this.attr('RoleArn', this.props.roleArn),
			...this.attr('EventBusName', this.props.eventBusName),
			...this.attr('EventPattern', this.props.eventPattern),
			Targets: this.props.targets.map(target => ({
				Arn: target.arn,
				Id: target.id,
				...this.attr('Input', target.input && JSON.stringify(target.input)),
			})),
		}
	}
}
