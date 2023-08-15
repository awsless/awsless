import { definePlugin } from '../../plugin.js';
import { z } from 'zod'
import { ScheduleExpressionSchema } from './schema/schedule.js';
import { Rule } from "aws-cdk-lib/aws-events";
import { toId, toName } from '../../util/__resource.js';
import { FunctionSchema, toFunction } from '../function/index.js';
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { ResourceIdSchema } from '../../schema/resource-id.js';

export const cronPlugin = definePlugin({
	name: 'cron',
	schema: z.object({
		stacks: z.object({
			crons: z.record(ResourceIdSchema, z.object({
				consumer: FunctionSchema,
				schedule: ScheduleExpressionSchema,
				description: z.string().max(512).optional()
			})).optional()
		}).array()
	}),
	onStack(context) {
		return Object.entries(context.stackConfig.crons || {}).map(([ id, props ]) => {
			const lambda = toFunction(context as any, id, props.consumer)
			const target = new LambdaFunction(lambda)

			new Rule(context.stack, toId('cron', id), {
				ruleName: toName(context.stack, id),
				schedule: props.schedule,
				description: props.description,
				targets: [ target ],
			});

			return lambda
		})
	},
})


// import { FunctionConfig, toFunction } from './function.js'
// import { Context } from '../stack.js'
// import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
// import { Duration } from '../util/duration.js'
// import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
// import { toId, toName } from '../util/resource.js'

//
// export const toCron = (ctx:Context, id:string, props:CronConfig) => {

// 	const { stack } = ctx
// 	const { lambda } = toFunction(ctx, id, props.consumer)
// 	const target = new LambdaFunction(lambda)

// 	const rule = new Rule(stack, toId('cron', id), {
// 		ruleName: toName(stack, id),
// 		schedule: Schedule.expression(props.schedule),
// 		description: props.description,
// 		targets: [ target ],
// 	});

// 	return {
// 		rule,
// 		lambda,
// 	}
// }
