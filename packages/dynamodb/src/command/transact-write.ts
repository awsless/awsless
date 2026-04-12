import { TransactWriteItem, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { getClient } from '../client'
import { Options } from '../types/options'

export type Transactable = {
	transact(): TransactWriteItem
}

type TransactWriteOptions = Options & {
	idempotantKey?: string
}

export const transactWrite = async (items: Transactable[], options: TransactWriteOptions = {}): Promise<void> => {
	const client = getClient(options)
	const command = new TransactWriteItemsCommand({
		ClientRequestToken: options.idempotantKey,
		TransactItems: items.map(item => item.transact()),
	})

	await client.send(command)
}
