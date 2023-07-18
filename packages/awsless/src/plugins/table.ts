
import { definePlugin } from "../plugin";
import { z } from 'zod'
import { addResourceEnvironment, toId, toName } from "../util/resource";
import { ResourceIdSchema } from "../schema/resource-id";
import { AttributeType, BillingMode, ProjectionType, Table, TableClass } from "aws-cdk-lib/aws-dynamodb";

const types = {
	string: AttributeType.STRING,
	number: AttributeType.NUMBER,
	binary: AttributeType.BINARY,
}

export const tablePlugin = definePlugin({
	name: 'table',
	schema: z.object({
		// defaults: z.object({
		// 	table: z.object({

		// 	}).default({}),
		// }).default({}),
		stacks: z.object({
			tables: z.record(
				ResourceIdSchema,
				z.object({
					hash: z.string(),
					sort: z.string().optional(),
					fields: z.record(z.string(), z.enum(['string', 'number', 'binary'])),
					pointInTimeRecovery: z.boolean().default(false),
					timeToLiveAttribute: z.string().optional(),
					indexes: z.record(z.string(), z.object({
						hash: z.string(),
						sort: z.string().optional(),
						// projection: z.enum(['ALL', 'KEYS_ONLY']),
					})).optional(),
				})
				.refine(props => props.fields.hasOwnProperty(props.hash), 'Hash key must be defined inside the table fields')
				.refine(props => (!props.sort || props.fields.hasOwnProperty(props.sort)), 'Sort key must be defined inside the table fields')
			).optional()
		}).array()
	}),
	onStack({ stack, stackConfig, bind }) {
		Object.entries(stackConfig.tables || {}).map(([ id, props ]) => {
			const buildKey = (attr: string) => {
				return { name: attr, type: types[props.fields[attr]] }
			}
			const table = new Table(stack, toId('table', id), {
				tableName: toName(stack, id),
				partitionKey: buildKey(props.hash),
				sortKey: props.sort ? buildKey(props.sort) : undefined,
				billingMode: BillingMode.PAY_PER_REQUEST,
				pointInTimeRecovery: props.pointInTimeRecovery,
				timeToLiveAttribute: props.timeToLiveAttribute,
				tableClass: TableClass.STANDARD,
			})

			Object.entries(props.indexes || {}).forEach(([ indexName, entry ]) => {
				table.addGlobalSecondaryIndex({
					indexName,
					partitionKey: buildKey(entry.hash),
					sortKey: entry.sort ? buildKey(entry.sort) : undefined,
					projectionType: ProjectionType.ALL,
				})
			})

			bind((lambda) => {
				table.grantReadWriteData(lambda)
				addResourceEnvironment(stack, 'table', id, lambda)
			})
		})
	},
})

// import { FunctionConfig } from './function'
// import { Context } from '../stack'
// import { Attribute, AttributeType, BillingMode, ProjectionType, Table, TableClass } from 'aws-cdk-lib/aws-dynamodb'
// import { Function } from 'aws-cdk-lib/aws-lambda'
// import { addResourceEnvironment, toId, toName } from '../util/resource'

// export type TableDefaults<Fields extends TableFields> = {
// 	pointInTimeRecovery?: boolean
// 	timeToLiveAttribute?: keyof Fields
// }

// export type TableFieldType = 'string' | 'number' | 'binary'
// export type TableFields = Record<string, TableFieldType>
// export type IndexConfig<Fields extends TableFields> = {
// 	hashKey: keyof Fields
// 	sortKey?: keyof Fields
// }

// export type TableConfig<Fields extends TableFields> = {
// 	streaming?: FunctionConfig
// 	hashKey: keyof Fields
// 	sortKey?: keyof Fields
// 	fields: Fields
// 	indexes?: Record<string, IndexConfig<Fields>>
// } & TableDefaults<Fields>

// const types: Record<TableFieldType, AttributeType> = {
// 	string: AttributeType.STRING,
// 	number: AttributeType.NUMBER,
// 	binary: AttributeType.BINARY,
// }

// const buildAttribute = <Fields extends TableFields>(fields:Fields, name:Extract<keyof Fields, string>): Attribute => {
// 	return {
// 		name,
// 		type: types[fields[name]]
// 	}
// }

// export const toTable = ({ stack }:Context, id:string, props:TableConfig<TableFields>) => {

// 	const table = new Table(stack, toId('table', id), {
// 		tableName: toName(stack, id),
// 		partitionKey: buildAttribute(props.fields, props.hashKey),
// 		sortKey: props.sortKey ? buildAttribute(props.fields, props.sortKey) : undefined,
// 		billingMode: BillingMode.PAY_PER_REQUEST,
// 		pointInTimeRecovery: props.pointInTimeRecovery,
// 		timeToLiveAttribute: props.timeToLiveAttribute,
// 		tableClass: TableClass.STANDARD,
// 	})

// 	Object.entries(props.indexes || {}).forEach(([ indexName, entry ]) => {
// 		table.addGlobalSecondaryIndex({
// 			indexName,
// 			partitionKey: buildAttribute(props.fields, entry.hashKey),
// 			sortKey: entry.sortKey ? buildAttribute(props.fields, entry.sortKey) : undefined,
// 		})
// 	})

// 	return {
// 		table,
// 		bind(lambda:Function) {
// 			table.grantReadWriteData(lambda)
// 			addResourceEnvironment(stack, 'table', id, lambda)
// 		}
// 	}
// }
