import { API } from '@opensearch-project/opensearch'
import { AnyTable } from '../table'

export const createIndex = async (table: AnyTable) => {
	const result = await table.client().cat.indices({ format: 'json' })
	const found = result.body.find(item => {
		return item.index === table.index
	})

	if (!found) {
		await table.client().indices.create({
			index: table.index,
		})
	}

	// A table schema is always an object schema, so its mapping is the
	// { properties } branch of the Mapping union.
	await table.client().indices.putMapping({
		index: table.index,
		body: table.schema.mapping as API.Indices_PutMapping_RequestBody,
	})
}
