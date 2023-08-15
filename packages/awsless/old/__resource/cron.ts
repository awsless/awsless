import { FunctionConfig, toFunction } from './function'
import { Context } from '../stack'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { Duration } from '../util/duration'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { toId, toName } from '../util/resource'

type RateExpression = `rate(${ Duration })`
type CronExpression = `cron(${string} ${string} ${string} ${string} ${string} ${string})`

export type CronConfig = {
	consumer: FunctionConfig
	schedule: RateExpression | CronExpression
	description?: string
}

export const toCron = (ctx:Context, id:string, props:CronConfig) => {

	const { stack } = ctx
	const { lambda } = toFunction(ctx, id, props.consumer)
	const target = new LambdaFunction(lambda)

	const rule = new Rule(stack, toId('cron', id), {
		ruleName: toName(stack, id),
		schedule: Schedule.expression(props.schedule),
		description: props.description,
		targets: [ target ],
	});

	return {
		rule,
		lambda,
	}
}
