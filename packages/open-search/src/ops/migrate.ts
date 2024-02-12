import { searchClient } from '../client'
import { AnyTable } from '../table'

export const migrate = async (table: AnyTable) => {
	const client = await searchClient()
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
