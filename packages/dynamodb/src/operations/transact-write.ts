
import { TransactWriteCommand, TransactWriteCommandOutput } from '@aws-sdk/lib-dynamodb'
import { ExpressionBuilder, Item, Options, Value } from '../types.js'
import { addConditionExpression, addExpression, generator } from '../helper/expression.js'
import { send } from '../helper/send.js'
import { Table } from '../table.js'

interface TransactWriteOptions extends Options {
	idempotantKey?: string
	items: Transactable<Table<Item, keyof Item>>[]
}

type Transactable<T extends Table<Item, keyof Item>> = ConditionCheck<T> | Put<T> | Update<T> | Delete<T>

interface Command {
	TableName: string
	ConditionExpression?: string
	ExpressionAttributeNames?: { [key: string]: string }
	ExpressionAttributeValues?: { [key: string]: Value }
}

interface ConditionCheck<T extends Table<Item, keyof Item>> {
	ConditionCheck: Command & {
		Key: T['key']
		ConditionExpression: string
	}
}

interface Put<T extends Table<Item, keyof Item>> {
	Put: Command & {
		Item: T['model']
	}
}

interface Update<T extends Table<Item, keyof Item>> {
	Update: Command & {
		Key: T['key']
		UpdateExpression: string
	}
}

interface Delete<T extends Table<Item, keyof Item>> {
	Delete: Command & {
		Key: T['key']
	}
}

export const transactWrite = async (options:TransactWriteOptions): Promise<void> => {
	const command = new TransactWriteCommand({
		ClientRequestToken: options.idempotantKey,
		TransactItems: options.items
	})

	await send(command, options) as TransactWriteCommandOutput
}

interface ConditionCheckOptions {
	condition: ExpressionBuilder
}

export const transactConditionCheck = <T extends Table<Item, keyof Item>>(
	table: T,
	key: T['key'],
	options: ConditionCheckOptions
) => {
	const gen = generator()
	const condition = options.condition(gen, table)
	const command: ConditionCheck<T> = {
		ConditionCheck: {
			TableName: table.toString(),
			Key: key,
			ConditionExpression: condition.query
		}
	}

	addExpression(command.ConditionCheck, condition)
	return command
}

interface PutOptions {
	condition?: ExpressionBuilder
}

export const transactPut = <T extends Table<Item, keyof Item>>(
	table: T,
	item: T['model'],
	options: PutOptions = {}
) => {
	const command: Put<T> = {
		Put: {
			TableName: table.name,
			Item: item,
		}
	}

	addConditionExpression(command.Put, options, generator(), table)

	return command
}

interface UpdateOptions {
	update: ExpressionBuilder
	condition?: ExpressionBuilder
}

export const transactUpdate = <T extends Table<Item, keyof Item>>(
	table: T,
	key: T['key'],
	options: UpdateOptions
) => {
	const gen = generator()
	const update = options.update(gen, table)
	const command: Update<T> = {
		Update: {
			TableName: table.toString(),
			Key: key,
			UpdateExpression: update.query,
		}
	}

	addExpression(command.Update, update)
	addConditionExpression(command.Update, options, gen, table)

	return command
}

interface DeleteOptions {
	condition?: ExpressionBuilder
}

export const transactDelete = <T extends Table<Item, keyof Item>>(
	table: T,
	key: T['key'],
	options: DeleteOptions = {}
) => {
	const command: Delete<T> = {
		Delete: {
			TableName: table.toString(),
			Key: key,
		}
	}

	addConditionExpression(command.Delete, options, generator(), table)

	return command
}
