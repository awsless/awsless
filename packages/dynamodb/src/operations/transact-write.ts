
import { AttributeValue, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb"
import { client } from "../client"
import { Condition, conditionExpression } from "../expressions/conditions"
import { updateExpression, UpdateExpression } from "../expressions/update"
import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition } from "../table"
import { PrimaryKey } from "../types/key"
import { Options } from "../types/options"

type Command = {
	TableName: string
	ConditionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
}

type ConditionCheck<T extends AnyTableDefinition> = {
	ConditionCheck: Command & {
		Key: PrimaryKey<T>
		ConditionExpression: string
	}
}

type Put<T extends AnyTableDefinition> = {
	Put: Command & {
		Item: T['schema']['INPUT']
	}
}

type Update<T extends AnyTableDefinition> = {
	Update: Command & {
		Key: PrimaryKey<T>
		UpdateExpression: string
	}
}

type Delete<T extends AnyTableDefinition> = {
	Delete: Command & {
		Key: PrimaryKey<T>
	}
}

type TransactWriteOptions = Options & {
	idempotantKey?: string
	items: Transactable<any>[]
}

type Transactable<T extends AnyTableDefinition> = ConditionCheck<T> | Put<T> | Update<T> | Delete<T>

export const transactWrite = async (options:TransactWriteOptions): Promise<void> => {
	const command = new TransactWriteItemsCommand({
		ClientRequestToken: options.idempotantKey,
		TransactItems: options.items
	})

	await client(options).send(command)
}

type ConditionCheckOptions<T extends AnyTableDefinition> = {
	condition: (exp:Condition<T>) => void
}

export const transactConditionCheck = <T extends AnyTableDefinition>(
	table: T,
	key: PrimaryKey<T>,
	options: ConditionCheckOptions<T>
): ConditionCheck<T> => {
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
	condition?: (exp:Condition<T>) => void
}

export const transactPut = <T extends AnyTableDefinition>(
	table: T,
	item: T['schema']['INPUT'],
	options: PutOptions<T> = {}
): Put<T> => {
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
	update: (exp:UpdateExpression<T>) => void
	condition?: (exp:Condition<T>) => void
}

export const transactUpdate = <T extends AnyTableDefinition>(
	table: T,
	key: PrimaryKey<T>,
	options: UpdateOptions<T>
): Update<T> => {
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
	condition?: (exp:Condition<T>) => void
}

export const transactDelete = <T extends AnyTableDefinition>(
	table: T,
	key: PrimaryKey<T>,
	options: DeleteOptions<T> = {}
): Delete<T> => {
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
