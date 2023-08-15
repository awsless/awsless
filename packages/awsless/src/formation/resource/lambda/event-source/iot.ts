import { Group } from "../../../resource"
import { TopicRule, TopicRuleSqlVersion } from "../../iot/topic-rule"
import { Function } from "../function"
import { Permission } from "../permission"

export class IotEventSource extends Group {
	constructor(id: string, lambda:Function, props: {
		name?: string
		sql: string
		sqlVersion?: TopicRuleSqlVersion
	}) {
		const topic = new TopicRule(id, {
			name: props.name,
			sql: props.sql,
			sqlVersion: props.sqlVersion,
			actions: [{ lambda: { functionArn: lambda.arn } }]
		})

		const permission = new Permission(id, {
			action: 'lambda:InvokeFunction',
			principal: 'iot.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: topic.arn,
		})

		super([ topic, permission ])
	}
}
