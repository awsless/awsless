import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, UpdateProps } from '../../../core/cloud'
import { AttributeValue, DeleteItemCommand, DynamoDB, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	table: string
	hash: string
	sort?: string
}

export class TableItemProvider implements CloudProvider {
	protected client: DynamoDB

	constructor(props: ProviderProps) {
		this.client = new DynamoDB(props)
	}

	own(id: string) {
		return id === 'aws-dynamodb-table-item'
	}

	private marshall(item: Record<string, any>) {
		return marshall(item, {
			removeUndefinedValues: true,
		})
	}

	private primaryKey(document: Document, item: Record<string, AttributeValue>) {
		const key: Record<string, AttributeValue | undefined> = {
			[document.hash]: item[document.hash],
		}

		if (document.sort) {
			key[document.sort] = item[document.sort]
		}

		return key
	}

	async get() {
		return {}
	}

	async create({ document, assets }: CreateProps<Document>) {
		const item = JSON.parse(assets.item!.data.toString('utf8'))
		const key = this.primaryKey(document, item)

		await this.client.send(
			new PutItemCommand({
				TableName: document.table,
				Item: this.marshall(item),
			})
		)

		return JSON.stringify([document.table, key])
	}

	async update({ id, oldDocument, newDocument, assets }: UpdateProps<Document>) {
		if (oldDocument.table !== newDocument.table) {
			throw new Error(`TableItem can't change the table name`)
		}

		if (oldDocument.hash !== newDocument.hash) {
			throw new Error(`TableItem can't change the hash key`)
		}

		if (oldDocument.sort !== newDocument.sort) {
			throw new Error(`TableItem can't change the sort key`)
		}

		const [_, oldKey] = JSON.parse(id)
		const item = JSON.parse(assets.item!.data.toString('utf8'))
		const key = this.primaryKey(newDocument, item)

		if (JSON.stringify(oldKey) !== JSON.stringify(key)) {
			// throw new Error(`TableItem can't change the primary key`)
			await this.client.send(
				new DeleteItemCommand({
					TableName: newDocument.table,
					Key: this.marshall(oldKey),
				})
			)
		}

		await this.client.send(
			new PutItemCommand({
				TableName: newDocument.table,
				Item: this.marshall(item),
			})
		)

		return JSON.stringify([newDocument.table, key])
	}

	async delete({ id }: DeleteProps<Document>) {
		const [table, oldKey] = JSON.parse(id)

		await this.client.send(
			new DeleteItemCommand({
				TableName: table,
				Key: this.marshall(oldKey),
			})
		)
	}
}
