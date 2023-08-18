
import { z } from 'zod'
import { definePlugin } from '../plugin';
import { ResourceIdSchema } from '../schema/resource-id';
import { FunctionSchema, toLambdaFunction } from './function';
import { IotEventSource } from '../formation/resource/lambda/event-source/iot';

export const pubsubPlugin = definePlugin({
	name: 'pubsub',
	schema: z.object({
		stacks: z.object({
			/** Define the pubsub subscriber in your stack.
			 * @example
			 * {
			 *   pubsub: {
			 *     NAME: {
			 *       sql: 'SELECT * FROM "table"',
			 *       consumer: 'function.ts',
			 *     }
			 *   }
			 * }
			 */
			pubsub: z.record(ResourceIdSchema, z.object({
				/** The SQL statement used to query the iot topic. */
				sql: z.string(),

				/** The version of the SQL rules engine to use when evaluating the rule. */
				sqlVersion: z.enum(['2015-10-08', '2016-03-23', 'beta']).default('2016-03-23'),

				/** The consuming lambda function properties. */
				consumer: FunctionSchema,
			})).optional()
		}).array()
	}),
	onApp({bind}) {
		bind(lambda => {
			lambda.addPermissions({
				actions: [ 'iot:publish' ],
				resources: [ '*' ],
			})
		})
	},
	onStack(ctx) {
		const { config, stack, stackConfig } = ctx

		for(const [ id, props ] of Object.entries(stackConfig.pubsub || {})) {
			const lambda = toLambdaFunction(ctx, `pubsub-${id}`, props.consumer)
			const source = new IotEventSource(id, lambda, {
				name: `${config.name}-${stack.name}-${id}`,
				sql: props.sql,
				sqlVersion: props.sqlVersion,
			})

			stack.add(lambda, source)
		}
	},
})
