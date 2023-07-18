import { definePlugin } from "../plugin";
import { z } from 'zod'
import { ScheduleExpressionSchema } from "../schema/schedule";
import { Rule } from "aws-cdk-lib/aws-events";
import { toId, toName } from "../util/resource";
import { FunctionSchema, toFunction } from "./function";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { ResourceIdSchema } from "../schema/resource-id";

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


// import { FunctionConfig, toFunction } from './function'
// import { Context } from '../stack'
// import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
// import { Duration } from '../util/duration'
// import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
// import { toId, toName } from '../util/resource'

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
