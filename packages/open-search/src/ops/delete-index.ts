import { AnyTable } from '../table'

export const deleteIndex = async (table: AnyTable) => {
	const result = await table.client().cat.indices({ format: 'json' })
	const found = result.body.find((item: { index: string }) => {
		return item.index === table.index
	})

	if (found) {
		await table.client().indices.delete({
			index: table.index,
		})
	}
}
