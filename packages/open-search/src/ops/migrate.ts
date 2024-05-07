import { AnyTable } from '../table'

export const migrate = async (table: AnyTable) => {
	const result = await table.client().cat.indices({ format: 'json' })
	const found = result.body.find((item: { index: string }) => {
		return item.index === table.index
	})

	if (!found) {
		await table.client().indices.create({
			index: table.index,
		})
	}

	await table.client().indices.putMapping({
		index: table.index,
		body: {
			...table.schema.props,
		},
	})
}
