import { Duration, toDays } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { AppContext, StackContext } from '../../feature.js'

export const filterPattern = `{${[
	`$.level = "WARN"`,
	`$.level = "ERROR"`,
	`$.level = "FATAL"`,
	`($.type = "platform.report" && $.record.status = "timeout")`,
	`($.type = "platform.report" && $.record.status = "error")`,
	`($.type = "platform.report" && $.record.status = "failure")`,
].join(' || ')}}`

// The subscriber arn only exists once the on-error-log handler is
// created, so the handler's own log group never subscribes to itself.
export const subscribeToErrorLog = (group: Group, ctx: StackContext | AppContext, logGroup: aws.cloudwatch.LogGroup) => {
	if (!ctx.shared.has('on-error-log', 'subscriber-arn')) {
		return
	}

	return new aws.cloudwatch.LogSubscriptionFilter(
		group,
		'on-error-log',
		{
			name: 'error-log-subscription',
			destinationArn: ctx.shared.get('on-error-log', 'subscriber-arn'),
			logGroupName: logGroup.name,
			filterPattern,
		},
		{
			replaceOnChanges: ['destinationArn'],
			dependsOn: [ctx.shared.get('on-error-log', 'permission')],
		}
	)
}

// A zero retention disables logging altogether, so no log group is created.
export const createLogGroup = (
	group: Group,
	ctx: StackContext | AppContext,
	props: {
		name: string
		retention?: Duration
		// Opt out for log groups that subscribe themselves later.
		errorLog?: boolean
	}
) => {
	if (!props.retention || props.retention.value <= 0n) {
		return
	}

	const logGroup = new aws.cloudwatch.LogGroup(
		group,
		'log',
		{
			name: props.name,
			retentionInDays: toDays(props.retention),
		},
		{
			import: ctx.import ? props.name : undefined,
		}
	)

	if (props.errorLog ?? true) {
		subscribeToErrorLog(group, ctx, logGroup)
	}

	return logGroup
}
