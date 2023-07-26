
import { definePlugin } from '../../plugin.js';
import { z } from 'zod'
import { addResourceEnvironment, toId, toName } from '../../util/resource.js';
import { ResourceIdSchema } from '../../schema/resource-id.js';
import { BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { TableClassSchema } from './schema/class-type.js';
import { AttributeSchema } from './schema/attribute.js';
import { KeySchema } from './schema/key.js';
import { ProjectionTypeSchema } from './schema/projection-type.js';

export const tablePlugin = definePlugin({
	name: 'table',
	schema: z.object({
		stacks: z.object({
			tables: z.record(
				ResourceIdSchema,
				z.object({
					hash: KeySchema,
					sort: KeySchema.optional(),
					fields: z.record(z.string(), AttributeSchema),
					class: TableClassSchema.default('standard'),
					pointInTimeRecovery: z.boolean().default(false),
					timeToLiveAttribute: z.string().optional(),
					indexes: z.record(z.string(), z.object({
						hash: KeySchema,
						sort: KeySchema.optional(),
						projection: ProjectionTypeSchema.default('all'),
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
	onStack({ stack, stackConfig, bind }) {
		Object.entries(stackConfig.tables || {}).map(([ id, props ]) => {
			const buildKey = (attr: string) => {
				return { name: attr, type: props.fields[attr] }
			}

			const table = new Table(stack, toId('table', id), {
				tableName: toName(stack, id),
				partitionKey: buildKey(props.hash),
				sortKey: props.sort ? buildKey(props.sort) : undefined,
				billingMode: BillingMode.PAY_PER_REQUEST,
				pointInTimeRecovery: props.pointInTimeRecovery,
				timeToLiveAttribute: props.timeToLiveAttribute,
				tableClass: props.class,
			})

			Object.entries(props.indexes || {}).forEach(([ indexName, entry ]) => {
				table.addGlobalSecondaryIndex({
					indexName,
					partitionKey: buildKey(entry.hash),
					sortKey: entry.sort ? buildKey(entry.sort) : undefined,
					...entry.projection,
				})
			})

			bind((lambda) => {
				table.grantReadWriteData(lambda)
				addResourceEnvironment(stack, 'table', id, lambda)
			})
		})
	},
})
