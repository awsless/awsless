import { AnyTable } from '../table'

type Options = {
	query?: unknown
	aggs?: unknown
	limit?: number
	cursor?: string
	sort?: unknown
	trackTotalHits?: boolean
}

type Response<T extends AnyTable> = {
	cursor?: string
	found: number
	count: number
	items: T['schema']['OUTPUT'][]
}

const encodeCursor = (cursor: object) => {
	const json = JSON.stringify(cursor)
	return Buffer.from(json, 'utf8').toString('base64')
}

const decodeCursor = (cursor?: string) => {
	if (!cursor) return

	try {
		const json = Buffer.from(cursor, 'base64').toString('utf8')

		return JSON.parse(json)
	} catch {
		return
	}
}

export const search = async <T extends AnyTable>(
	table: T,
	{ query, aggs, limit = 10, cursor, sort, trackTotalHits }: Options
): Promise<Response<T>> => {
	const result = await table.client().search({
		index: table.index,
		body: {
			size: limit + 1,
			search_after: decodeCursor(cursor),
			track_total_hits: trackTotalHits,
			query,
			aggs,
			sort,
		},
	})

	const { hits, total } = result.body.hits as {
		total: { value: number }
		hits: {
			_source: T['schema']['ENCODED']
			sort: object
		}[]
	}

	let nextCursor: string | undefined

	if (hits.length > limit) {
		const last = hits[limit - 1]
		if (last) {
			nextCursor = encodeCursor(last.sort)
		}
	}

	const items = hits.splice(0, limit)

	return {
		cursor: nextCursor,
		found: total.value,
		count: items.length,
		items: items.map(item => table.schema.decode(item._source)),
	}
}
