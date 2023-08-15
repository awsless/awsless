import { FunctionConfig } from './function'
import { Context } from '../stack'
import { Attribute, AttributeType, BillingMode, Table, TableClass } from 'aws-cdk-lib/aws-dynamodb'
import { Function } from 'aws-cdk-lib/aws-lambda'
import { addResourceEnvironment, toId, toName } from '../util/resource'

export type TableDefaults<Fields extends TableFields> = {
	pointInTimeRecovery?: boolean
	timeToLiveAttribute?: keyof Fields
}

export type TableFieldType = 'string' | 'number' | 'binary'
export type TableFields = Record<string, TableFieldType>
export type IndexConfig<Fields extends TableFields> = {
	hashKey: keyof Fields
	sortKey?: keyof Fields
}

export type TableConfig<Fields extends TableFields> = {
	streaming?: FunctionConfig
	hashKey: keyof Fields
	sortKey?: keyof Fields
	fields: Fields
	indexes?: Record<string, IndexConfig<Fields>>
} & TableDefaults<Fields>

const types: Record<TableFieldType, AttributeType> = {
	string: AttributeType.STRING,
	number: AttributeType.NUMBER,
	binary: AttributeType.BINARY,
}

const buildAttribute = <Fields extends TableFields>(fields:Fields, name:Extract<keyof Fields, string>): Attribute => {
	return {
		name,
		type: types[fields[name]]
	}
}

export const toTable = ({ stack }:Context, id:string, props:TableConfig<TableFields>) => {

	const table = new Table(stack, toId('table', id), {
		tableName: toName(stack, id),
		partitionKey: buildAttribute(props.fields, props.hashKey),
		sortKey: props.sortKey ? buildAttribute(props.fields, props.sortKey) : undefined,
		billingMode: BillingMode.PAY_PER_REQUEST,
		pointInTimeRecovery: props.pointInTimeRecovery,
		timeToLiveAttribute: props.timeToLiveAttribute,
		tableClass: TableClass.STANDARD,
	})

	Object.entries(props.indexes || {}).forEach(([ indexName, entry ]) => {
		table.addGlobalSecondaryIndex({
			indexName,
			partitionKey: buildAttribute(props.fields, entry.hashKey),
			sortKey: entry.sortKey ? buildAttribute(props.fields, entry.sortKey) : undefined,
		})
	})

	return {
		table,
		bind(lambda:Function) {
			table.grantReadWriteData(lambda)
			addResourceEnvironment(stack, 'table', id, lambda)
		}
	}
}
