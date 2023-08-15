
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { toId, toName } from '../util/__resource.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { FunctionSchema, toFunction } from './function/index.js';
import { CfnTopicRule } from 'aws-cdk-lib/aws-iot';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { snakeCase } from 'change-case';

export const pubsubPlugin = definePlugin({
	name: 'pubsub',
	schema: z.object({
		stacks: z.object({
			pubsub: z.record(ResourceIdSchema, z.object({
				sql: z.string(),
				sqlVersion: z.enum(['2015-10-08', '2016-03-23', 'beta']).default('2016-03-23'),
				consumer: FunctionSchema,
			})).optional()
		}).array()
	}),
	onStack(ctx) {
		const { stack, stackConfig, bind } = ctx

		bind(lambda => {
			lambda.addToRolePolicy(new PolicyStatement({
				actions: [ 'iot:publish' ],
				resources: [ '*' ],
			}))
		})

		return Object.entries(stackConfig.pubsub || {}).map(([ id, props ]) => {
			const lambda = toFunction(ctx as any, id, props.consumer)

			new CfnTopicRule(stack, toId('pubsub', id), {
				ruleName: snakeCase(toName(stack, id)),
				topicRulePayload: {
					sql: props.sql,
					awsIotSqlVersion: props.sqlVersion,
					actions: [{
						lambda: {
							functionArn: lambda.functionArn
						}
					}]
				}
			})

			return lambda
		})
	},
})
