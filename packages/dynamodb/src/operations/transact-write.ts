
import { TransactWriteCommand, TransactWriteCommandOutput } from '@aws-sdk/lib-dynamodb'
import { Expression, Item, Options, Value } from '../types.js'
import { addExpression } from '../helper/expression.js'
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
	condition: Expression
}

export const transactConditionCheck = <T extends Table<Item, keyof Item>>(
	table: T,
	key: T['key'],
	{ condition }: ConditionCheckOptions
) => {
	const command: ConditionCheck<T> = {
		ConditionCheck: {
			TableName: table.toString(),
			Key: key,
			ConditionExpression: condition.expression
		}
	}

	addExpression(command.ConditionCheck, condition)
	return command
}

interface PutOptions {
	condition?: Expression
}

export const transactPut = <T extends Table<Item, keyof Item>>(
	table: T,
	item: T['model'],
	{ condition }: PutOptions = {}
) => {
	const command: Put<T> = {
		Put: {
			TableName: table.name,
			Item: item,
		}
	}

	if(condition) {
		command.Put.ConditionExpression = condition.expression
		addExpression(command.Put, condition)
	}

	return command
}

interface UpdateOptions {
	update: Expression
	condition?: Expression
}

export const transactUpdate = <T extends Table<Item, keyof Item>>(
	table: T,
	key: T['key'],
	{ update, condition }: UpdateOptions
) => {
	const command: Update<T> = {
		Update: {
			TableName: table.toString(),
			Key: key,
			UpdateExpression: update.expression,
		}
	}

	addExpression(command.Update, update)

	if(condition) {
		command.Update.ConditionExpression = condition.expression
		addExpression(command.Update, condition)
	}

	return command
}

interface DeleteOptions {
	condition?: Expression
}

export const transactDelete = <T extends Table<Item, keyof Item>>(
	table: T,
	key: T['key'],
	{ condition }: DeleteOptions = {}
) => {
	const command: Delete<T> = {
		Delete: {
			TableName: table.toString(),
			Key: key,
		}
	}

	if(condition) {
		command.Delete.ConditionExpression = condition.expression
		addExpression(command.Delete, condition)
	}

	return command
}
