import { TransactWriteItem, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client'
import { Options } from '../types/options'

export type Transactable = {
	transact(): TransactWriteItem
}

type TransactWriteOptions = Options & {
	idempotantKey?: string
}

export const transactWrite = async (items: Transactable[], options: TransactWriteOptions = {}): Promise<void> => {
	const command = new TransactWriteItemsCommand({
		ClientRequestToken: options.idempotantKey,
		TransactItems: items.map(item => item.transact()),
	})

	await client(options).send(command)
}
