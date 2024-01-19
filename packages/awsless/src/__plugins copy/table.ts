import { z } from 'zod'
import { definePlugin } from '../plugin.js'
import { ResourceIdSchema } from '../config/schema/resource-id.js'
import { Table } from '../formation/resource/dynamodb/table.js'
import { FunctionSchema, toLambdaFunction } from './function.js'
import { DynamoDBEventSource } from '../formation/resource/lambda/event-source/dynamodb.js'
import { getGlobalOnFailure } from './on-failure/util.js'
import { TypeGen, TypeObject } from '../util/type-gen.js'
import { formatName } from '../formation/util.js'

const KeySchema = z.string().min(1).max(255)

export const tablePlugin = definePlugin({
	name: 'table',
	schema: z.object({
		stacks: z
			.object({
				/** Define the tables in your stack.
				 * @example
				 * {
				 *   tables: {
				 *     TABLE_NAME: {
				 *       hash: 'id',
				 *       fields: {
				 *         id: 'number'
				 *       }
				 *     }
				 *   }
				 * }
				 * */
				tables: z
					.record(
						ResourceIdSchema,
						z.object({
							/** Specifies the name of the partition / hash key that makes up the primary key for the table. */
							hash: KeySchema,

							/** Specifies the name of the range / sort key that makes up the primary key for the table. */
							sort: KeySchema.optional(),

							/** A list of attributes that describe the key schema for the table and indexes.
							 * If no attribute field is defined we default to 'string'.
							 * @example
							 * {
							 *   fields: {
							 *     id: 'string'
							 *   }
							 * }
							 */
							fields: z.record(z.string(), z.enum(['string', 'number', 'binary'])).optional(),

							/** The table class of the table.
							 * @default 'standard'
							 */
							class: z.enum(['standard', 'standard-infrequent-access']).default('standard'),

							/** Indicates whether point in time recovery is enabled on the table.
							 * @default false
							 */
							pointInTimeRecovery: z.boolean().default(false),

							/** The name of the TTL attribute used to store the expiration time for items in the table.
							 * - To update this property, you must first disable TTL and then enable TTL with the new attribute name.
							 */
							timeToLiveAttribute: KeySchema.optional(),

							/** The settings for the DynamoDB table stream, which capture changes to items stored in the table. */
							stream: z
								.object({
									/** When an item in the table is modified,
									 * stream.type determines what information is written to the stream for this table.
									 * Valid values are:
									 * - keys-only - Only the key attributes of the modified item are written to the stream.
									 * - new-image - The entire item, as it appears after it was modified, is written to the stream.
									 * - old-image - The entire item, as it appeared before it was modified, is written to the stream.
									 * - new-and-old-images - Both the new and the old item images of the item are written to the stream.
									 */
									type: z.enum(['keys-only', 'new-image', 'old-image', 'new-and-old-images']),

									/** The consuming lambda function for the stream */
									consumer: FunctionSchema,
								})
								.optional(),

							/** Specifies the global secondary indexes to be created on the table.
							 * @example
							 * {
							 *   indexes: {
							 *     INDEX_NAME: {
							 *       hash: 'other'
							 *     }
							 *   }
							 * }
							 */
							indexes: z
								.record(
									z.string(),
									z.object({
										/** Specifies the name of the partition / hash key that makes up the primary key for the global secondary index. */
										hash: KeySchema,

										/** Specifies the name of the range / sort key that makes up the primary key for the global secondary index. */
										sort: KeySchema.optional(),

										/** The set of attributes that are projected into the index:
										 * - all - All of the table attributes are projected into the index.
										 * - keys-only - Only the index and primary keys are projected into the index.
										 * @default 'all'
										 */
										projection: z.enum(['all', 'keys-only']).default('all'),
									})
								)
								.optional(),
						})
					)
					.optional(),
			})
			.array(),
	}),
	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of config.stacks) {
			const list = new TypeObject(2)

			for (const name of Object.keys(stack.tables || {})) {
				const tableName = formatName(`${config.name}-${stack.name}-${name}`)
				list.addType(name, `'${tableName}'`)
			}

			resources.addType(stack.name, list)
		}

		gen.addInterface('TableResources', resources)

		await write('table.d.ts', gen, true)
	},
	onStack(ctx) {
		const { config, stack, stackConfig, bind } = ctx
		for (const [id, props] of Object.entries(stackConfig.tables || {})) {
			const table = new Table(id, {
				...props,
				name: `${config.name}-${stack.name}-${id}`,
				stream: props.stream?.type,
			})

			stack.add(table)

			if (props.stream) {
				const lambda = toLambdaFunction(ctx as any, `stream-${id}`, props.stream.consumer)
				const source = new DynamoDBEventSource(id, lambda, {
					tableArn: table.arn,
					onFailure: getGlobalOnFailure(ctx),
					...props.stream,
				})

				stack.add(lambda, source)
			}

			bind(lambda => {
				lambda.addPermissions(table.permissions)
			})
		}
	},
})
