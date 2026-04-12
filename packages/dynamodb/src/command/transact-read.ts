import { AttributeValue, TransactGetItem, TransactGetItemsCommand } from '@aws-sdk/client-dynamodb'
import { getClient } from '../client'
import { Options } from '../types/options'

export type Transactable = {
	transact(): {
		input: TransactGetItem
		unmarshall(item: Record<string, AttributeValue>): any
	}
}

type TransactReadResponse<T extends Transactable[]> = {
	[K in keyof T]: ReturnType<ReturnType<T[K]['transact']>['unmarshall']> | undefined
}

type TransactWriteOptions = Options

export const transactRead = async <const T extends Transactable[]>(
	items: T,
	options: TransactWriteOptions = {}
): Promise<TransactReadResponse<T>> => {
	const transactItems = items.map(item => item.transact())
	const command = new TransactGetItemsCommand({
		TransactItems: transactItems.map(item => item.input),
	})

	const client = getClient(options)
	const result = await client.send(command)
	const responses = result.Responses ?? []

	return responses.map((res, i) => {
		if (res.Item) {
			return transactItems[i]!.unmarshall(res.Item)
		}
	}) as TransactReadResponse<T>
}
