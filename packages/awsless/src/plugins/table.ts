
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { Table } from '../formation/resource/dynamodb/table.js';

const KeySchema = z.string().min(1).max(255)

export const tablePlugin = definePlugin({
	name: 'table',
	schema: z.object({
		stacks: z.object({
			/** Define the tables in your stack
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
			tables: z.record(
				ResourceIdSchema,
				z.object({
					/** Specifies the name of the partition / hash key that makes up the primary key for the table. */
					hash: KeySchema,

					/** Specifies the name of the range / sort key that makes up the primary key for the table. */
					sort: KeySchema.optional(),

					/** A list of attributes that describe the key schema for the table and indexes.
					 * @example
					 * {
					 *   fields: {
					 *     id: 'string'
					 *   }
					 * }
					*/
					fields: z.record(z.string(), z.enum(['string', 'number', 'binary'])),

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
					indexes: z.record(z.string(), z.object({
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
					})).optional(),
				})
				.refine(props => {
					return (
						// Check the hash key
						props.fields.hasOwnProperty(props.hash) &&
						// Check the sort key
						(!props.sort || props.fields.hasOwnProperty(props.sort)) &&
						// Check all indexes
						!Object.values(props.indexes || {}).map(index => (
							// Check the index hash key
							props.fields.hasOwnProperty(index.hash) &&
							// Check the index sort key
							(!index.sort || props.fields.hasOwnProperty(index.sort))
						)).includes(false)
					)
				}, 'Hash & Sort keys must be defined inside the table fields')
			).optional()
		}).array()
	}),
	onStack({ config, stack, stackConfig, bind }) {
		for(const [ id, props ] of Object.entries(stackConfig.tables || {})) {
			const table = new Table(id, {
				name: `${config.name}-${stack.name}-${id}`,
				...props,
			})

			stack.add(table)

			bind((lambda) => {
				lambda.addPermissions(table.permissions)
				// lambda.addEnvironment(`RESOURCE_TABLE_${stack.name}_${id}`, table.name)
			})
		}
	},
})
