import { AttributeValue, TransactGetItem, TransactGetItemsCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client'
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

	const result = await client(options).send(command)

	return result.Responses!.map((res, i) => {
		if (res.Item) {
			return transactItems[i]!.unmarshall(res.Item)
		}
	}) as TransactReadResponse<T>
}
