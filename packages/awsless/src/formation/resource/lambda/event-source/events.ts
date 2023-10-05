
import { Group } from '../../../resource.js'
import { Rule } from '../../events/rule.js'
import { Function } from '../function.js'
import { Permission } from '../permission.js'

export class EventsEventSource extends Group {
	constructor(id: string, lambda:Function, props: {
		schedule: string
		payload?: unknown
	}) {
		const rule = new Rule(id, {
			schedule: props.schedule,
			targets: [{
				id,
				arn: lambda.arn,
				input: props.payload,
			}]
		})

		const permission = new Permission(id, {
			action: 'lambda:InvokeFunction',
			principal: 'events.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: rule.arn,
		})

		super([ rule, permission ])
	}
}
