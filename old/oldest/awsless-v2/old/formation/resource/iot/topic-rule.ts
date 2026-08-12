import { snakeCase } from 'change-case'
import { Resource } from '../../resource.js'

export type TopicRuleSqlVersion = '2015-10-08' | '2016-03-23' | 'beta'

export type TopicRuleProps = {
	name?: string
	sql: string
	sqlVersion?: TopicRuleSqlVersion
	actions: { lambda: { functionArn: string } }[]
}

export class TopicRule extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: TopicRuleProps) {
		super('AWS::IoT::TopicRule', logicalId)

		this.name = snakeCase(this.props.name || logicalId)
	}

	get arn() {
		return this.getAtt('Arn')
	}

	protected properties() {
		return {
			RuleName: this.name,
			TopicRulePayload: {
				Sql: this.props.sql,
				AwsIotSqlVersion: this.props.sqlVersion ?? '2016-03-23',
				RuleDisabled: false,
				Actions: this.props.actions.map(action => ({
					Lambda: { FunctionArn: action.lambda.functionArn },
				})),
			},
		}
	}
}
