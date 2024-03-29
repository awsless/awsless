
import { TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb"
import { client } from "../client"
import { Combine, Condition, conditionExpression } from "../expressions/condition"
import { updateExpression, UpdateExpression } from "../expressions/update"
import { debug } from "../helper/debug"
import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition } from "../table"
import { PrimaryKey } from "../types/key"
import { Options } from "../types/options"
import { AttributeValue } from "../types/value"

type Command = {
	TableName: string
	ConditionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
}

export type TransactConditionCheck<T extends AnyTableDefinition> = {
	ConditionCheck: Command & {
		Key: PrimaryKey<T>
		ConditionExpression: string
	}
}

export type TransactPut<T extends AnyTableDefinition> = {
	Put: Command & {
		Item: T['schema']['INPUT']
	}
}

export type TransactUpdate<T extends AnyTableDefinition> = {
	Update: Command & {
		Key: PrimaryKey<T>
		UpdateExpression: string
	}
}

export type TransactDelete<T extends AnyTableDefinition> = {
	Delete: Command & {
		Key: PrimaryKey<T>
	}
}

export type Transactable<T extends AnyTableDefinition> = TransactConditionCheck<T> | TransactPut<T> | TransactUpdate<T> | TransactDelete<T>

type TransactWriteOptions = Options & {
	idempotantKey?: string
	items: Transactable<any>[]
}

export const transactWrite = async (options:TransactWriteOptions): Promise<void> => {
	const command = new TransactWriteItemsCommand({
		ClientRequestToken: options.idempotantKey,
		TransactItems: options.items
	})

	debug(options, command)

	await client(options).send(command)
}

type ConditionCheckOptions<T extends AnyTableDefinition> = {
	condition: (exp:Condition<T>) => Combine<T>
}

export const transactConditionCheck = <T extends AnyTableDefinition>(
	table: T,
	key: PrimaryKey<T>,
	options: ConditionCheckOptions<T>
): TransactConditionCheck<T> => {
	const gen = new IDGenerator(table)
	return {
		ConditionCheck: {
			TableName: table.name,
			Key: table.marshall(key),
			ConditionExpression: conditionExpression<T>(options, gen)!,
			...gen.attributes(),
		}
	}
}

type PutOptions<T extends AnyTableDefinition> = {
	condition?: (exp:Condition<T>) => Combine<T>
}

export const transactPut = <T extends AnyTableDefinition>(
	table: T,
	item: T['schema']['INPUT'],
	options: PutOptions<T> = {}
): TransactPut<T> => {
	const gen = new IDGenerator(table)
	return {
		Put: {
			TableName: table.name,
			Item: table.marshall(item),
			ConditionExpression: conditionExpression<T>(options, gen),
			...gen.attributes(),
		}
	}
}

type UpdateOptions<T extends AnyTableDefinition> = {
	update: (exp:UpdateExpression<T>) => UpdateExpression<T>
	condition?: (exp:Condition<T>) => Combine<T>
}

export const transactUpdate = <T extends AnyTableDefinition>(
	table: T,
	key: PrimaryKey<T>,
	options: UpdateOptions<T>
): TransactUpdate<T> => {
	const gen = new IDGenerator(table)
	return {
		Update: {
			TableName: table.name,
			Key: table.marshall(key),
			UpdateExpression: updateExpression<T>(options, gen),
			ConditionExpression: conditionExpression<T>(options, gen),
			...gen.attributes()
		}
	}
}

type DeleteOptions<T extends AnyTableDefinition> = {
	condition?: (exp:Condition<T>) => Combine<T>
}

export const transactDelete = <T extends AnyTableDefinition>(
	table: T,
	key: PrimaryKey<T>,
	options: DeleteOptions<T> = {}
): TransactDelete<T> => {
	const gen = new IDGenerator(table)
	return {
		Delete: {
			TableName: table.name,
			Key: table.marshall(key),
			ConditionExpression: conditionExpression<T>(options, gen),
			...gen.attributes()
		}
	}
}
