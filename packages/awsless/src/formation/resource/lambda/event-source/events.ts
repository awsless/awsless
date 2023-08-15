
import { Group } from "../../../resource"
import { Rule } from "../../events/rule"
import { Function } from "../function"
import { Permission } from "../permission"

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
