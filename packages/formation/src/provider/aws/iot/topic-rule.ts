import { ARN } from '../types'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'

export type TopicRuleSqlVersion = '2015-10-08' | '2016-03-23' | 'beta'

export type TopicRuleProps = {
	name: Input<string>
	sql: Input<string>
	sqlVersion?: Input<TopicRuleSqlVersion>
	enabled?: Input<boolean>
	actions: Input<
		Input<{
			lambda: Input<{
				functionArn: Input<ARN>
			}>
		}>[]
	>
}

export class TopicRule extends CloudControlApiResource {
	constructor(id: string, private props: TopicRuleProps) {
		super('AWS::IoT::TopicRule', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	toState() {
		return {
			document: {
				RuleName: this.props.name,
				TopicRulePayload: {
					Sql: this.props.sql,
					AwsIotSqlVersion: unwrap(this.props.sqlVersion, '2016-03-23'),
					RuleDisabled: !unwrap(this.props.enabled, true),
					Actions: unwrap(this.props.actions).map(action => ({
						Lambda: { FunctionArn: unwrap(unwrap(action).lambda).functionArn },
					})),
				},
			},
		}
	}
}
