import { Client } from '@opensearch-project/opensearch/.'
import { searchClient } from '../client'
import { AnyTable } from '../table'

type Options = {
	client?: Client
}

export const migrate = async (table: AnyTable, { client = searchClient() }: Options = {}) => {
	const result = await client.cat.indices({ format: 'json' })
	const found = result.body.find((item: { index: string }) => {
		return item.index === table.index
	})

	if (!found) {
		await client.indices.create({
			index: table.index,
		})
	}

	await client.indices.putMapping({
		index: table.index,
		body: {
			...table.schema.props,
		},
	})
}
