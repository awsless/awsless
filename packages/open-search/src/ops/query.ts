import { searchClient } from '../client'
import { AnyTable } from '../table'

type Options = {
	query: string
}

export const query = async <T>(table: AnyTable, { query }: Options): Promise<T> => {
	const client = await searchClient()
	const result = await client.transport.request({
		method: 'POST',
		path: '_plugins/_sql?format=json',
		body: { query },
	})

	const { hits } = result.body.hits as {
		hits: {
			_source: AnyTable['schema']['ENCODED']
			sort: object
		}[]
	}

	return hits.map(item => table.schema.decode(item._source)) as T
}
