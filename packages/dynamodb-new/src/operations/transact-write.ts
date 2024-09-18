import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client'
import { Combine, Condition, conditionExpression } from '../expressions/condition'
import { updateExpression, UpdateExpression } from '../expressions/update'
import { debug } from '../helper/debug'
import { IDGenerator } from '../helper/id-generator'
import { AnyTable } from '../table'
import { PrimaryKey } from '../types/key'
import { Options } from '../types/options'

type Command = {
	TableName: string
	ConditionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, any>
}

export type TransactConditionCheck = {
	ConditionCheck: Command & {
		Key: any
		ConditionExpression: string
	}
}

export type TransactPut = {
	Put: Command & {
		Item: any
	}
}

export type TransactUpdate = {
	Update: Command & {
		Key: any
		UpdateExpression: string
	}
}

export type TransactDelete = {
	Delete: Command & {
		Key: any
	}
}

export type Transactable = TransactConditionCheck | TransactPut | TransactUpdate | TransactDelete

type TransactWriteOptions = Options & {
	idempotantKey?: string
	items: Transactable[]
}

export const transactWrite = async (options: TransactWriteOptions): Promise<void> => {
	const command = new TransactWriteItemsCommand({
		ClientRequestToken: options.idempotantKey,
		TransactItems: options.items,
	})

	debug(options, command)

	await client(options).send(command)
}

type ConditionCheckOptions<T extends AnyTable> = {
	condition: (exp: Condition<T>) => Combine<T>
}

export const transactConditionCheck = <T extends AnyTable>(
	table: T,
	key: PrimaryKey<T>,
	options: ConditionCheckOptions<T>
): TransactConditionCheck => {
	const gen = new IDGenerator(table)
	return {
		ConditionCheck: {
			TableName: table.name,
			Key: table.marshall(key),
			ConditionExpression: conditionExpression<T>(options, gen)!,
			...gen.attributes(),
		},
	}
}

type PutOptions<T extends AnyTable> = {
	condition?: (exp: Condition<T>) => Combine<T>
}

export const transactPut = <T extends AnyTable>(
	table: T,
	item: T['schema']['INPUT'],
	options: PutOptions<T> = {}
): TransactPut => {
	const gen = new IDGenerator(table)
	return {
		Put: {
			TableName: table.name,
			Item: table.marshall(item),
			ConditionExpression: conditionExpression<T>(options, gen),
			...gen.attributes(),
		},
	}
}

type UpdateOptions<T extends AnyTable> = {
	update: (exp: UpdateExpression<T>) => UpdateExpression<T>
	condition?: (exp: Condition<T>) => Combine<T>
}

export const transactUpdate = <T extends AnyTable>(
	table: T,
	key: PrimaryKey<T>,
	options: UpdateOptions<T>
): TransactUpdate => {
	const gen = new IDGenerator(table)
	return {
		Update: {
			TableName: table.name,
			Key: table.marshall(key),
			UpdateExpression: updateExpression<T>(options, gen),
			ConditionExpression: conditionExpression<T>(options, gen),
			...gen.attributes(),
		},
	}
}

type DeleteOptions<T extends AnyTable> = {
	condition?: (exp: Condition<T>) => Combine<T>
}

export const transactDelete = <T extends AnyTable>(
	table: T,
	key: PrimaryKey<T>,
	options: DeleteOptions<T> = {}
): TransactDelete => {
	const gen = new IDGenerator(table)
	return {
		Delete: {
			TableName: table.name,
			Key: table.marshall(key),
			ConditionExpression: conditionExpression<T>(options, gen),
			...gen.attributes(),
		},
	}
}
